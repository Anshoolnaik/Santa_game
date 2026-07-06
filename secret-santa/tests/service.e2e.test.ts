import { describe, it, expect } from "vitest";
import { SecretSantaService } from "../src/SecretSantaService.js";
import { BipartiteMatchingStrategy } from "../src/strategy/BipartiteMatchingStrategy.js";
import { CsvEmployeeReader } from "../src/io/CsvEmployeeReader.js";
import { CsvAssignmentReader } from "../src/io/CsvAssignmentReader.js";
import { NoRepeatPreviousYearConstraint } from "../src/constraints/NoRepeatPreviousYearConstraint.js";
import { createSeededRandom } from "../src/util/random.js";

// End-to-end over the actual challenge data shipped in data/.
describe("SecretSantaService (end-to-end with real data)", () => {
  const employees = new CsvEmployeeReader().read("data/employees.csv");
  const previous = new CsvAssignmentReader().read(
    "data/previous-year-assignments.csv",
  );

  it("loads the full 15-person roster including duplicate names", () => {
    expect(employees).toHaveLength(15);
    expect(employees.filter((e) => e.name === "Hamish Murray")).toHaveLength(3);
  });

  it("assigns everyone a valid secret child, avoiding last year's pairings", () => {
    const service = new SecretSantaService(
      new BipartiteMatchingStrategy(createSeededRandom(2023)),
    );
    const result = service.generate(employees, previous);

    expect(result).toHaveLength(15);

    // Bijection: each giver once, each child once, no self-gifting.
    expect(new Set(result.map((a) => a.giver.id)).size).toBe(15);
    expect(new Set(result.map((a) => a.child.id)).size).toBe(15);
    for (const a of result) expect(a.giver.equals(a.child)).toBe(false);

    // No repeat of last year.
    const noRepeat = new NoRepeatPreviousYearConstraint(previous);
    for (const a of result) {
      expect(noRepeat.isAllowed(a.giver, a.child)).toBe(true);
    }
  });
});
