import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Assignment } from "../domain/Assignment.js";
import { FileReadError } from "../errors.js";
import { AssignmentWriter } from "./ports.js";
import { toCsv } from "./csv.js";

const HEADER = [
  "Employee_Name",
  "Employee_EmailID",
  "Secret_Child_Name",
  "Secret_Child_EmailID",
] as const;

/** Writes the generated assignments to a CSV file in the required format. */
export class CsvAssignmentWriter implements AssignmentWriter {
  write(target: string, assignments: readonly Assignment[]): void {
    const rows: string[][] = [
      [...HEADER],
      ...assignments.map((a) => [
        a.giver.name,
        a.giver.email,
        a.child.name,
        a.child.email,
      ]),
    ];

    try {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, toCsv(rows), "utf-8");
    } catch (cause) {
      throw new FileReadError(target, cause);
    }
  }
}
