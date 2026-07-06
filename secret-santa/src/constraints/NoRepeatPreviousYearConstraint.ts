import { Employee } from "../domain/Employee.js";
import { Assignment } from "../domain/Assignment.js";
import { AssignmentConstraint } from "./AssignmentConstraint.js";

/**
 * Rule: an employee cannot be paired with the same secret child they were
 * assigned in the previous year's event.
 *
 * The previous pairings are indexed by giver id for O(1) lookup, so applying
 * the constraint across the whole roster stays linear.
 */
export class NoRepeatPreviousYearConstraint implements AssignmentConstraint {
  readonly name = "NoRepeatPreviousYear";

  /** giver.id -> previous child.id */
  private readonly previousChildByGiver: Map<string, string>;

  constructor(previousAssignments: readonly Assignment[]) {
    this.previousChildByGiver = new Map(
      previousAssignments.map((a) => [a.giver.id, a.child.id]),
    );
  }

  isAllowed(giver: Employee, candidate: Employee): boolean {
    return this.previousChildByGiver.get(giver.id) !== candidate.id;
  }
}
