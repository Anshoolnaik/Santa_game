import { Employee } from "./domain/Employee.js";
import { Assignment } from "./domain/Assignment.js";
import { AssignmentConstraint } from "./constraints/AssignmentConstraint.js";
import { NoSelfAssignmentConstraint } from "./constraints/NoSelfAssignmentConstraint.js";
import { NoRepeatPreviousYearConstraint } from "./constraints/NoRepeatPreviousYearConstraint.js";
import { AssignmentStrategy } from "./strategy/AssignmentStrategy.js";

/**
 * Orchestrates a Secret Santa run: assemble the rules, delegate to a matching
 * strategy, and defensively verify the result.
 *
 * The service depends only on abstractions (the strategy and constraint
 * interfaces) and pure domain objects — it performs no IO. Reading/writing is
 * the CLI's job. This separation keeps the core logic trivial to unit-test.
 */
export class SecretSantaService {
  constructor(private readonly strategy: AssignmentStrategy) {}

  /**
   * Generate assignments for `employees`, avoiding self-pairings and any
   * pairing repeated from `previousAssignments`. Extra `additionalConstraints`
   * can be supplied to extend the rules without modifying this class.
   */
  generate(
    employees: readonly Employee[],
    previousAssignments: readonly Assignment[] = [],
    additionalConstraints: readonly AssignmentConstraint[] = [],
  ): Assignment[] {
    const constraints: AssignmentConstraint[] = [
      new NoSelfAssignmentConstraint(),
      new NoRepeatPreviousYearConstraint(previousAssignments),
      ...additionalConstraints,
    ];

    const assignments = this.strategy.assign(employees, constraints);
    this.assertValid(employees, assignments, constraints);
    return assignments;
  }

  /**
   * Belt-and-braces invariant check on the strategy's output: correct count,
   * every giver used once, every child used once, all constraints honoured.
   * Guards against a buggy strategy silently producing an invalid result.
   */
  private assertValid(
    employees: readonly Employee[],
    assignments: readonly Assignment[],
    constraints: readonly AssignmentConstraint[],
  ): void {
    if (assignments.length !== employees.length) {
      throw new Error(
        `Expected ${employees.length} assignments but got ${assignments.length}.`,
      );
    }

    const givers = new Set<string>();
    const children = new Set<string>();
    for (const a of assignments) {
      givers.add(a.giver.id);
      children.add(a.child.id);
      for (const c of constraints) {
        if (!c.isAllowed(a.giver, a.child)) {
          throw new Error(
            `Constraint "${c.name}" violated by assignment ${a}.`,
          );
        }
      }
    }

    if (givers.size !== employees.length) {
      throw new Error("Some employee was assigned as a giver more than once.");
    }
    if (children.size !== employees.length) {
      throw new Error("Some employee was assigned as a secret child more than once.");
    }
  }
}
