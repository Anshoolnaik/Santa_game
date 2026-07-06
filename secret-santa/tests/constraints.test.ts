import { describe, it, expect } from "vitest";
import { Employee } from "../src/domain/Employee.js";
import { Assignment } from "../src/domain/Assignment.js";
import { NoSelfAssignmentConstraint } from "../src/constraints/NoSelfAssignmentConstraint.js";
import { NoRepeatPreviousYearConstraint } from "../src/constraints/NoRepeatPreviousYearConstraint.js";

const ada = new Employee("Ada", "ada@acme.com");
const bob = new Employee("Bob", "bob@acme.com");
const cy = new Employee("Cy", "cy@acme.com");

describe("NoSelfAssignmentConstraint", () => {
  const rule = new NoSelfAssignmentConstraint();

  it("disallows an employee gifting themselves", () => {
    expect(rule.isAllowed(ada, ada)).toBe(false);
  });

  it("allows gifting someone else", () => {
    expect(rule.isAllowed(ada, bob)).toBe(true);
  });
});

describe("NoRepeatPreviousYearConstraint", () => {
  const rule = new NoRepeatPreviousYearConstraint([new Assignment(ada, bob)]);

  it("disallows repeating last year's child", () => {
    expect(rule.isAllowed(ada, bob)).toBe(false);
  });

  it("allows a different child", () => {
    expect(rule.isAllowed(ada, cy)).toBe(true);
  });

  it("does not constrain givers absent from last year's data", () => {
    expect(rule.isAllowed(bob, ada)).toBe(true);
  });
});
