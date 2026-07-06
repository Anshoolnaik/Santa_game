# Secret Santa — Explanation & Interview Prep

Your personal cheat-sheet for explaining this project confidently. Read it
top-to-bottom once, then skim the **Q&A** section before any review.

---

## 1. The 30-second pitch (memorize this)

> "It's a program that automates a company Secret Santa. You give it a CSV of
> employees, and it assigns each person one other person to gift — making sure
> nobody gets themselves, nobody repeats last year's person, and everyone both
> gives and receives exactly once. I modelled it as a **matching problem** and
> solved it with a proven algorithm, so it always finds a valid arrangement if
> one exists — instead of randomly guessing. The code is split into small,
> swappable pieces with tests, error handling, and docs."

---

## 2. The problem (what the assessment asked)

Company "Acme" runs a Secret Santa. Automate the assignment with 4 rules:

1. An employee can't be their own secret child.
2. An employee can't get the **same** child as the previous year.
3. Everyone gives exactly one gift.
4. Everyone receives exactly one gift.

- **Input:** CSV of employees (`Employee_Name`, `Employee_EmailID`).
- **Optional input:** last year's assignments (to avoid repeats).
- **Output:** CSV of pairings (employee → secret child).

They grade **design quality**, not just correctness: modular OOP, tests, error
handling, documentation, and Git submission.

---

## 3. Key insight to mention: identity is the EMAIL, not the name

The provided roster has **three different people named "Hamish Murray"**, two
"Charlie Ross", and two "Matthew King" — each with a unique email. So the whole
system identifies people by **email**, never by name. Pointing this out shows you
actually read the data. (See `Employee.ts` → the `id` getter.)

---

## 4. Architecture — the layers and WHY

Each layer has one job and depends on **interfaces**, not concrete classes. That
is the "modular and extensible" requirement, made real.

| Layer | File(s) | Responsibility |
|-------|---------|----------------|
| **Domain** | `domain/Employee.ts`, `domain/Assignment.ts` | Plain data + invariants. No file/CSV logic. |
| **Constraints** | `constraints/*` | The rules. Each rule is its own class implementing `AssignmentConstraint`. |
| **Strategy** | `strategy/BipartiteMatchingStrategy.ts` | The algorithm that finds a valid assignment. |
| **IO** | `io/*` | Reading/writing CSV, hidden behind reader/writer interfaces. |
| **Service** | `SecretSantaService.ts` | Wires rules + strategy together, verifies the result. |
| **CLI** | `cli.ts` | The terminal command; parses args, calls the service, prints results. |

**The one sentence that sells the design:**
> "Because everything talks through interfaces, I can add a new rule, swap the
> algorithm, or change the file format — each without touching the other parts."

### Concrete extensibility examples (great to say out loud)
- **New rule** ("don't gift someone on your own team") → write one new class
  implementing `AssignmentConstraint`. Nothing else changes.
- **New algorithm** → implement `AssignmentStrategy`, inject it into the service.
- **New data source** (database, Excel, API) → implement `EmployeeReader`. The
  core engine never touches the filesystem.

---

## 5. The algorithm — how auto-assign actually works

### Why not just assign randomly?
Random assignment can **get stuck**: the last person left might only be
assignable to themselves (illegal), forcing a restart. No guarantee it ever
finishes.

### The better model: bipartite matching
Picture two columns — givers on the left, the same people as candidate children
on the right. Draw a line from each giver to every child they're **allowed** to
gift (not self, not last year's). The goal: **pick one line per giver so no two
givers point at the same child.** That's a "perfect matching."

### How it's found (Kuhn's algorithm — `tryAugment`)
Go person by person and try to give each one a child:
- If their preferred child is **free**, take it.
- If it's **taken**, ask the current owner: *"can you move to a different
  allowed child?"* If yes, they shuffle over and the child frees up.

This "bump the current owner down the line" chain is why it **never gets stuck**
— if any valid arrangement exists, it finds it.

**Complexity:** O(V·E) worst case — instant for company-sized rosters.

### Two extra touches
- **Shuffling** (seedable): each person's allowed list is randomly shuffled so
  pairings vary year to year. `--seed <n>` makes a run reproducible.
- **Safety re-check:** after matching, the service independently verifies the
  result (right count, everyone gives once, everyone receives once, no rule
  broken). Catches any bug before writing the file.

---

## 6. Error handling (what to point at)

A typed error hierarchy in `errors.ts`. The CLI catches these, prints a clean
message, and exits non-zero:

| Error | When |
|-------|------|
| `FileReadError` | File can't be read/written |
| `CsvParseError` | Malformed CSV or missing column |
| `ValidationError` | Empty roster, blank field, duplicate email |
| `NoValidAssignmentError` | Rules make a valid assignment impossible |

Say: *"Expected failures are typed and produce friendly messages; unexpected
bugs surface with a full stack trace, so I never hide real problems."*

---

## 7. Testing (31 tests, `npm test`)

Cover: domain rules, the CSV parser (quotes/commas/newlines/escaping), both
constraints, the matching strategy (valid result, no repeats, reproducibility,
**and impossible cases that must throw**), the IO readers/writer, and an
end-to-end run over the real 15-person data.

The test worth highlighting: *"I test the **unsolvable** case too — 2 people who
each had the other last year — and assert it correctly refuses instead of
producing a broken assignment."*

---

## 8. Live demo script (do this in front of them)

```bash
cd d:\Secret_Santa\secret-santa
npm install          # once
npm test             # show 31 passing tests
npm run assign       # generate the assignment
```
Then open `data/assignments.csv` and point out: 15 rows, nobody gifts
themselves, and compare a couple against `previous-year-assignments.csv` to show
no repeats.

Bonus — show it fails gracefully:
```bash
npm start -- -e data/does-not-exist.csv   # clean FileReadError, exit code 1
```

---

## 9. Q&A — likely questions with answers

**Q: Walk me through what happens when I run it.**
A: The CLI reads the employee CSV into `Employee` objects and last year's CSV
into `Assignment` objects. The service builds the two rules, hands everything to
the matching strategy, which finds a valid arrangement. The service re-verifies
it, then the writer saves it to a CSV.

**Q: Why bipartite matching instead of shuffling until it works?**
A: Reliability and termination. Shuffle-and-retry can loop forever on tightly
constrained rosters and has no guarantee. Matching provably finds a valid
assignment if one exists, in polynomial time.

**Q: What if there's no valid assignment?**
A: The strategy detects the matching is incomplete and throws
`NoValidAssignmentError` — naming who couldn't be placed — instead of writing
garbage.

**Q: How do you handle two employees with the same name?**
A: Identity is the email, not the name. `Employee.id` is the lowercased email,
so the three "Hamish Murray"s are treated as distinct people everywhere.

**Q: How is this extensible? Add a rule live.**
A: Implement `AssignmentConstraint` (one `isAllowed(giver, candidate)` method)
and pass it into `service.generate(...)`. No existing code changes — I designed
constraints as a plug-in point.

**Q: Why are results different each run?**
A: I shuffle each person's candidate list with a seedable RNG so pairings feel
fresh yearly. Pass `--seed` for a reproducible run (I use that in tests).

**Q: Where's the previous-year file from? It wasn't provided.**
A: Correct — they only gave the employee list (as Excel). I converted that to
CSV as the challenge specifies, and created a **sample** previous-year file to
demonstrate the no-repeat rule. The program runs fine with or without it.

**Q: What would you improve with more time?**
A: Optionally read `.xlsx` directly, add a "no two people gift each other"
(mutual-pair) rule, emails/notifications to each giver, and a coverage report in
CI.

**Q: Is the algorithm fair/random?**
A: It's uniform-ish via shuffling, not provably uniform over all valid
derangements. For a gift exchange that's fine; if strict fairness mattered I'd
use a uniform random derangement generator, but that complicates the
previous-year constraint.

---

## 10. Vocabulary to sound fluent

- **Derangement** — a permutation where nothing maps to itself (exactly our "no
  self-gift" requirement).
- **Bipartite matching** — pairing items across two groups with no reuse.
- **Kuhn's / augmenting-path algorithm** — the standard method to find a maximum
  matching.
- **Dependency inversion** — depending on interfaces, not concrete classes (why
  the IO and algorithm are swappable).
