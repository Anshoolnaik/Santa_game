import { Employee } from "../domain/Employee.js";
import { Assignment } from "../domain/Assignment.js";

/**
 * IO "ports" (interfaces) that the service depends on, following the
 * dependency-inversion principle. The core logic never touches the filesystem
 * or CSV directly — it works against these abstractions, so an alternate
 * source (database, XLSX, HTTP) can be dropped in without changing the engine.
 */

export interface EmployeeReader {
  read(source: string): Employee[];
}

export interface PreviousAssignmentReader {
  read(source: string): Assignment[];
}

export interface AssignmentWriter {
  write(target: string, assignments: readonly Assignment[]): void;
}
