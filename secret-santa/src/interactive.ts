import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { SecretSantaService } from "./SecretSantaService.js";
import { BipartiteMatchingStrategy } from "./strategy/BipartiteMatchingStrategy.js";
import { CsvEmployeeReader } from "./io/CsvEmployeeReader.js";
import { CsvAssignmentReader } from "./io/CsvAssignmentReader.js";
import { CsvAssignmentWriter } from "./io/CsvAssignmentWriter.js";
import { SecretSantaError } from "./errors.js";

/**
 * Friendly, prompt-driven front-end for people who don't want to remember CLI
 * flags. It asks for each file path (Windows users can drag a file from
 * Explorer into the terminal to paste its path), then reuses the exact same
 * engine as the CLI.
 */
async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log("\n🎅  Secret Santa — interactive mode");
  console.log("    Tip: drag a file into this window to paste its path.\n");

  try {
    const employeesPath = clean(
      await rl.question("Path to the EMPLOYEE csv (required): "),
    );
    if (!employeesPath) {
      console.error("✖ No employee file given. Nothing to do.");
      rl.close();
      process.exit(2);
    }

    const previousPath = clean(
      await rl.question(
        "Path to LAST YEAR's csv (optional — press Enter to skip): ",
      ),
    );

    const outputAnswer = clean(
      await rl.question(
        "Where to SAVE the result (press Enter for data/assignments.csv): ",
      ),
    );
    const outputPath = outputAnswer || "data/assignments.csv";

    rl.close();

    // Read inputs (typed errors below give friendly messages).
    const employees = new CsvEmployeeReader().read(employeesPath);
    const previous = previousPath
      ? new CsvAssignmentReader().read(previousPath)
      : [];

    const strategy = new BipartiteMatchingStrategy(makeRandom(Date.now()));
    const service = new SecretSantaService(strategy);
    const assignments = service.generate(employees, previous);

    new CsvAssignmentWriter().write(outputPath, assignments);

    console.log(
      `\n✔ Assigned ${assignments.length} secret children` +
        (previousPath ? " (avoiding last year's pairings)" : "") +
        `.\n  Saved to: ${outputPath}\n`,
    );

    // Show a quick preview so the user sees a result without opening the file.
    console.log("  Preview:");
    for (const a of assignments.slice(0, 5)) {
      console.log(`    ${a.giver.name}  →  ${a.child.name}`);
    }
    if (assignments.length > 5) {
      console.log(`    …and ${assignments.length - 5} more.\n`);
    }
  } catch (err) {
    rl.close();
    if (err instanceof SecretSantaError) {
      console.error(`\n✖ ${err.name}: ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}

/**
 * Normalise a pasted path: trim whitespace and strip the surrounding quotes
 * that Windows adds when you drag a file with spaces in its name.
 */
function clean(input: string): string {
  return input.trim().replace(/^["']|["']$/g, "");
}

/** mulberry32 — inline so this entry point has no extra imports. */
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

main();