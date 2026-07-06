import { Employee } from "../domain/Employee.js";
import { AssignmentConstraint } from "./AssignmentConstraint.js";

/** Rule: an employee cannot be their own secret child. */
export class NoSelfAssignmentConstraint implements AssignmentConstraint {
  readonly name = "NoSelfAssignment";

  isAllowed(giver: Employee, candidate: Employee): boolean {
    return !giver.equals(candidate);
  }
}
