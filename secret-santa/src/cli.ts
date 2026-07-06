#!/usr/bin/env -S npx tsx
import { SecretSantaService } from "./SecretSantaService.js";
import { BipartiteMatchingStrategy } from "./strategy/BipartiteMatchingStrategy.js";
import { CsvEmployeeReader } from "./io/CsvEmployeeReader.js";
import { CsvAssignmentReader } from "./io/CsvAssignmentReader.js";
import { CsvAssignmentWriter } from "./io/CsvAssignmentWriter.js";
import { SecretSantaError } from "./errors.js";

interface CliOptions {
  employees: string;
  previous?: string;
  output: string;
  seed?: number;
}

const USAGE = `
Secret Santa — assign a secret child to every employee.

Usage:
  npm start -- --employees <file> [--previous <file>] [--output <file>] [--seed <n>]

Options:
  --employees, -e   Path to the employee roster CSV (required).
                    Columns: Employee_Name, Employee_EmailID
  --previous,  -p   Path to last year's assignments CSV (optional).
                    Columns: Employee_Name, Employee_EmailID,
                             Secret_Child_Name, Secret_Child_EmailID
  --output,    -o   Path for the generated assignments CSV
                    (default: data/assignments.csv).
  --seed,      -s   Integer seed for reproducible shuffling
                    (default: time-based, so results vary per run).
  --help,      -h   Show this help.
`.trim();

function parseArgs(argv: string[]): CliOptions {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const alias: Record<string, string> = {
      "-e": "--employees",
      "-p": "--previous",
      "-o": "--output",
      "-s": "--seed",
      "-h": "--help",
    };
    const key = alias[arg] ?? arg;
    if (key === "--help") {
      console.log(USAGE);
      process.exit(0);
    }
    if (key.startsWith("--")) {
      args[key.slice(2)] = argv[++i] ?? "";
    }
  }

  if (!args.employees) {
    console.error("Error: --employees is required.\n");
    console.error(USAGE);
    process.exit(2);
  }

  return {
    employees: args.employees,
    previous: args.previous,
    output: args.output ?? "data/assignments.csv",
    seed: args.seed !== undefined ? Number(args.seed) : undefined,
  };
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));

  const employees = new CsvEmployeeReader().read(opts.employees);
  const previous = opts.previous
    ? new CsvAssignmentReader().read(opts.previous)
    : [];

  // A clock-derived seed by default so each run shuffles differently; a fixed
  // --seed makes runs reproducible. (Date.now avoids importing anything.)
  const seed = opts.seed ?? Date.now();
  const strategy = new BipartiteMatchingStrategy(makeRandom(seed));
  const service = new SecretSantaService(strategy);

  const assignments = service.generate(employees, previous);
  new CsvAssignmentWriter().write(opts.output, assignments);

  console.log(
    `✔ Assigned ${assignments.length} secret children` +
      (opts.previous ? " (avoiding last year's pairings)" : "") +
      `.\n  Roster:  ${opts.employees}` +
      (opts.previous ? `\n  History: ${opts.previous}` : "") +
      `\n  Output:  ${opts.output}\n  Seed:    ${seed}`,
  );
}

/** mulberry32 — kept inline so the CLI has no extra imports. */
function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

try {
  main();
} catch (err) {
  if (err instanceof SecretSantaError) {
    console.error(`✖ ${err.name}: ${err.message}`);
    process.exit(1);
  }
  throw err; // unexpected: let it surface with a full stack trace
}
