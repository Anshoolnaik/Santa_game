// Public API surface for using the engine as a library.
export { Employee } from "./domain/Employee.js";
export { Assignment } from "./domain/Assignment.js";
export { SecretSantaService } from "./SecretSantaService.js";

export type { AssignmentConstraint } from "./constraints/AssignmentConstraint.js";
export { NoSelfAssignmentConstraint } from "./constraints/NoSelfAssignmentConstraint.js";
export { NoRepeatPreviousYearConstraint } from "./constraints/NoRepeatPreviousYearConstraint.js";

export type { AssignmentStrategy } from "./strategy/AssignmentStrategy.js";
export { BipartiteMatchingStrategy } from "./strategy/BipartiteMatchingStrategy.js";

export type {
  EmployeeReader,
  PreviousAssignmentReader,
  AssignmentWriter,
} from "./io/ports.js";
export { CsvEmployeeReader } from "./io/CsvEmployeeReader.js";
export { CsvAssignmentReader } from "./io/CsvAssignmentReader.js";
export { CsvAssignmentWriter } from "./io/CsvAssignmentWriter.js";

export * from "./errors.js";
