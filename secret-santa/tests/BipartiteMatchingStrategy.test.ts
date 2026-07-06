import { describe, it, expect } from "vitest";
import { Employee } from "../src/domain/Employee.js";
import { Assignment } from "../src/domain/Assignment.js";
import { BipartiteMatchingStrategy } from "../src/strategy/BipartiteMatchingStrategy.js";
import { NoSelfAssignmentConstraint } from "../src/constraints/NoSelfAssignmentConstraint.js";
import { NoRepeatPreviousYearConstraint } from "../src/constraints/NoRepeatPreviousYearConstraint.js";
import { AssignmentConstraint } from "../src/constraints/AssignmentConstraint.js";
import { NoValidAssignmentError } from "../src/errors.js";
import { createSeededRandom } from "../src/util/random.js";

function roster(n: number): Employee[] {
  return Array.from(
    { length: n },
    (_, i) => new Employee(`Emp${i}`, `emp${i}@acme.com`),
  );
}

function assertValidDerangement(
  employees: Employee[],
  assignments: Assignment[],
  constraints: AssignmentConstraint[],
): void {
  expect(assignments).toHaveLength(employees.length);
  const givers = new Set(assignments.map((a) => a.giver.id));
  const children = new Set(assignments.map((a) => a.child.id));
  expect(givers.size).toBe(employees.length); // each giver once
  expect(children.size).toBe(employees.length); // each child once
  for (const a of assignments) {
    for (const c of constraints) {
      expect(c.isAllowed(a.giver, a.child)).toBe(true);
    }
  }
}

describe("BipartiteMatchingStrategy", () => {
  const selfRule = [new NoSelfAssignmentConstraint()];

  it("produces a valid derangement (no one gifts themselves)", () => {
    const employees = roster(15);
    const strategy = new BipartiteMatchingStrategy(createSeededRandom(1));
    const result = strategy.assign(employees, selfRule);
    assertValidDerangement(employees, result, selfRule);
  });

  it("respects the previous-year constraint", () => {
    const employees = roster(10);
    // Fabricate a full previous year so the constraint is heavily exercised.
    const previous = employees.map(
      (e, i) => new Assignment(e, employees[(i + 1) % employees.length]!),
    );
    const constraints: AssignmentConstraint[] = [
      new NoSelfAssignmentConstraint(),
      new NoRepeatPreviousYearConstraint(previous),
    ];
    const strategy = new BipartiteMatchingStrategy(createSeededRandom(7));
    const result = strategy.assign(employees, constraints);
    assertValidDerangement(employees, result, constraints);
  });

  it("is reproducible for a given seed", () => {
    const employees = roster(12);
    const a = new BipartiteMatchingStrategy(createSeededRandom(42)).assign(
      employees,
      selfRule,
    );
    const b = new BipartiteMatchingStrategy(createSeededRandom(42)).assign(
      employees,
      selfRule,
    );
    expect(a.map((x) => x.toString())).toEqual(b.map((x) => x.toString()));
  });

  it("throws for a roster of one", () => {
    expect(() => new BipartiteMatchingStrategy().assign(roster(1), selfRule)).toThrow(
      NoValidAssignmentError,
    );
  });

  it("throws when constraints make assignment impossible", () => {
    // Two employees who each gifted the only other person last year -> stuck.
    const employees = roster(2);
    const previous = [
      new Assignment(employees[0]!, employees[1]!),
      new Assignment(employees[1]!, employees[0]!),
    ];
    const constraints: AssignmentConstraint[] = [
      new NoSelfAssignmentConstraint(),
      new NoRepeatPreviousYearConstraint(previous),
    ];
    expect(() =>
      new BipartiteMatchingStrategy().assign(employees, constraints),
    ).toThrow(NoValidAssignmentError);
  });
});
