# Secret Santa 🎅

A small, modular TypeScript engine that assigns every employee a unique **secret
child** for a company Secret Santa event, honouring the challenge's rules:

- An employee is never their own secret child.
- An employee is never paired with the **same** child as the previous year.
- Every employee gives exactly one gift, and every employee receives exactly one.

It reads a roster CSV (plus an optional previous-year assignments CSV) and writes
the new assignments to a CSV.

---

## Why the design looks like this

The challenge grades **modularity, extensibility, testing, error handling and
documentation**, so the code is split into single-responsibility pieces that
depend on interfaces rather than each other:

```
src/
├─ domain/            Pure data + invariants (no IO)
│  ├─ Employee.ts        Identity is the EMAIL, not the name*
│  └─ Assignment.ts      A giver → child pairing (rejects self-pairing)
├─ constraints/       Pluggable rules — the main extension point
│  ├─ AssignmentConstraint.ts        interface: isAllowed(giver, candidate)
│  ├─ NoSelfAssignmentConstraint.ts
│  └─ NoRepeatPreviousYearConstraint.ts
├─ strategy/          Pluggable assignment algorithms
│  ├─ AssignmentStrategy.ts          interface: assign(employees, constraints)
│  └─ BipartiteMatchingStrategy.ts   Kuhn's max-matching — reliable & efficient
├─ io/                Filesystem/CSV adapters behind interfaces ("ports")
│  ├─ ports.ts                       EmployeeReader / …Writer interfaces
│  ├─ csv.ts                         dependency-free RFC-4180 parser/serialiser
│  ├─ headers.ts                     case-insensitive column mapping
│  ├─ CsvEmployeeReader.ts
│  ├─ CsvAssignmentReader.ts
│  └─ CsvAssignmentWriter.ts
├─ util/random.ts     Seedable PRNG (reproducible in tests, varied in prod)
├─ errors.ts          Typed error hierarchy (SecretSantaError → …)
├─ SecretSantaService.ts   Orchestrator: wires rules + strategy, verifies output
├─ index.ts           Public library API
└─ cli.ts             Command-line entry point
```

\* **Names are not unique.** The provided roster contains three different people
called "Hamish Murray", two "Charlie Ross", and two "Matthew King", each with a
distinct email. Every part of the system therefore keys on the **email**
(case-insensitively), never the name.

### Extension points

- **New rule?** Implement `AssignmentConstraint` and pass it to
  `SecretSantaService.generate(..., [myConstraint])`. No existing code changes.
- **New algorithm?** Implement `AssignmentStrategy` and inject it into the
  service.
- **New data source (DB, XLSX, HTTP)?** Implement `EmployeeReader` /
  `AssignmentWriter`. The core engine never touches the filesystem.

### Why bipartite matching (not shuffle-and-retry)?

The assignment is modelled as **maximum bipartite matching** (givers ↔ eligible
children) solved with **Kuhn's augmenting-path algorithm**:

- **Reliable** — if any valid full assignment exists, it is *always* found.
  Random shuffle-and-retry can fail to converge on tightly constrained rosters.
- **Efficient** — `O(V·E)` worst case, trivial for company-sized rosters.
- **Correct-by-verification** — the service independently re-checks the result
  (right count, bijection, all constraints satisfied) before returning it.

Candidate order is shuffled with a **seedable PRNG**, so results vary year to
year but can be reproduced exactly with `--seed`.

---

## Requirements

- **Node.js ≥ 18** (developed on Node 22).
- No build step needed to run — [`tsx`](https://github.com/privatenumber/tsx)
  executes the TypeScript directly.

## Installation

```bash
npm install
```

## Usage

### Easiest — interactive mode (no flags to remember)

```bash
npm run assign:pick
```

It asks for each file and writes the result. On Windows you can **drag a file
from Explorer into the terminal** to paste its path automatically. Press Enter
to skip the optional previous-year file or accept the default output location.

### Sample data

```bash
# Uses data/employees.csv + data/previous-year-assignments.csv:
npm run assign
```

### Direct CLI (scriptable, with flags)

```bash
npm start -- --employees <roster.csv> [--previous <lastyear.csv>] [--output <out.csv>] [--seed <n>]
```

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--employees` | `-e` | Roster CSV (**required**) | — |
| `--previous`  | `-p` | Previous-year assignments CSV (optional) | none |
| `--output`    | `-o` | Where to write the result | `data/assignments.csv` |
| `--seed`      | `-s` | Integer seed for reproducible shuffling | time-based |
| `--help`      | `-h` | Show help | — |

### Input format — roster (`--employees`)

```csv
Employee_Name,Employee_EmailID
Hamish Murray,hamish.murray@acme.com
Layla Graham,layla.graham@acme.com
```

### Input format — previous year (`--previous`)

```csv
Employee_Name,Employee_EmailID,Secret_Child_Name,Secret_Child_EmailID
Hamish Murray,hamish.murray@acme.com,Layla Graham,layla.graham@acme.com
```

Column order does not matter and matching is case-insensitive. A missing
previous-year file is treated as "no prior event".

### Output format (`--output`)

```csv
Employee_Name,Employee_EmailID,Secret_Child_Name,Secret_Child_EmailID
Hamish Murray,hamish.murray@acme.com,Matthew King,matthew.king.jr@acme.com
...
```

## Using it as a library

```ts
import {
  SecretSantaService,
  BipartiteMatchingStrategy,
  CsvEmployeeReader,
  CsvAssignmentReader,
  CsvAssignmentWriter,
} from "./src/index.js";

const employees = new CsvEmployeeReader().read("data/employees.csv");
const previous = new CsvAssignmentReader().read("data/previous-year-assignments.csv");

const service = new SecretSantaService(new BipartiteMatchingStrategy());
const assignments = service.generate(employees, previous);

new CsvAssignmentWriter().write("data/assignments.csv", assignments);
```

## Testing

```bash
npm test            # run the vitest suite once
npm run test:watch  # watch mode
npm run typecheck   # strict tsc type-checking, no emit
```

The suite (31 tests) covers domain invariants, the CSV parser (quotes, commas,
CRLF, escaping), both constraints, the matching strategy (valid derangement,
previous-year avoidance, reproducibility, and unsolvable cases that must throw),
the IO adapters (BOM, duplicate emails, missing columns/files), and an
end-to-end run over the real challenge data.

## Error handling

All expected failures raise a typed `SecretSantaError`; the CLI prints a concise
message and exits non-zero (unexpected bugs surface with a full stack trace):

| Error | Cause | Exit code |
|-------|-------|-----------|
| `FileReadError` | Roster/output file can't be read or written | 1 |
| `CsvParseError` | Malformed CSV or missing required column | 1 |
| `ValidationError` | Empty roster, blank field, or duplicate email | 1 |
| `NoValidAssignmentError` | Constraints make a full assignment impossible | 1 |
| (missing `--employees`) | Usage error | 2 |

## Project scripts

| Script | Purpose |
|--------|---------|
| `npm start -- …` | Run the CLI |
| `npm run assign:pick` | Interactive mode — prompts for each file |
| `npm run assign` | Run the CLI against the bundled sample data |
| `npm test` | Run the test suite |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run build` | Emit compiled JS to `dist/` |

## License

MIT
