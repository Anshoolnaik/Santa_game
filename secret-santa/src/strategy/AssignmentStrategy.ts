import { Employee } from "../domain/Employee.js";
import { Assignment } from "../domain/Assignment.js";
import { AssignmentConstraint } from "../constraints/AssignmentConstraint.js";

/**
 * Produces a complete set of Secret Santa pairings for a roster.
 *
 * Implementations decide *how* pairings are found (random retry, bipartite
 * matching, ...). Swapping the algorithm is a one-line change in the service,
 * which keeps the engine extensible per the challenge's OOP expectations.
 *
 * A valid result is a bijection over the roster in which every pairing is
 * permitted by every supplied constraint. Implementations MUST throw
 * `NoValidAssignmentError` when no such set exists rather than return a
 * partial/invalid result.
 */
export interface AssignmentStrategy {
  assign(
    employees: readonly Employee[],
    constraints: readonly AssignmentConstraint[],
  ): Assignment[];
}
