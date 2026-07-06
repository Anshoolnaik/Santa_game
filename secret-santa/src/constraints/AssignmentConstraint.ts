import { Employee } from "../domain/Employee.js";

/**
 * A rule that decides whether a giver is allowed to be paired with a
 * particular candidate secret child.
 *
 * Constraints are intentionally small and composable: to add a new rule
 * (e.g. "no pairing within the same team") you implement this interface and
 * pass it in — no existing code changes. This is the main extension point of
 * the assignment engine.
 */
export interface AssignmentConstraint {
  /** Human-readable name, used in diagnostics/error messages. */
  readonly name: string;

  /** Returns true if `giver -> candidate` is permitted by this rule. */
  isAllowed(giver: Employee, candidate: Employee): boolean;
}
