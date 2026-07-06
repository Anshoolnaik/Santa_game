import { readFileSync } from "node:fs";
import { Employee } from "../domain/Employee.js";
import { Assignment } from "../domain/Assignment.js";
import { CsvParseError, FileReadError, ValidationError } from "../errors.js";
import { PreviousAssignmentReader } from "./ports.js";
import { parseCsv } from "./csv.js";
import { buildHeaderIndex } from "./headers.js";

const EMP_NAME = "Employee_Name";
const EMP_EMAIL = "Employee_EmailID";
const CHILD_NAME = "Secret_Child_Name";
const CHILD_EMAIL = "Secret_Child_EmailID";

/**
 * Reads previous-year Secret Santa assignments from a CSV file so the
 * no-repeat constraint can use them. A missing file is treated as "no previous
 * event" (returns an empty list) rather than an error, since the challenge
 * states previous data is provided only "if applicable".
 */
export class CsvAssignmentReader implements PreviousAssignmentReader {
  /** @param optional if true, a missing file yields [] instead of throwing. */
  constructor(private readonly optional = true) {}

  read(source: string): Assignment[] {
    let text: string;
    try {
      text = readFileSync(source, "utf-8");
    } catch (cause) {
      if (this.optional && isFileNotFound(cause)) return [];
      throw new FileReadError(source, cause);
    }

    const rows = parseCsv(text.replace(/^﻿/, ""));
    if (rows.length === 0) {
      throw new CsvParseError(`Assignment file "${source}" is empty.`);
    }

    const header = buildHeaderIndex(
      rows[0]!,
      [EMP_NAME, EMP_EMAIL, CHILD_NAME, CHILD_EMAIL],
      source,
    );

    const assignments: Assignment[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      if (row.every((cell) => cell.trim() === "")) continue;

      try {
        const giver = new Employee(
          row[header[EMP_NAME]!] ?? "",
          row[header[EMP_EMAIL]!] ?? "",
        );
        const child = new Employee(
          row[header[CHILD_NAME]!] ?? "",
          row[header[CHILD_EMAIL]!] ?? "",
        );
        assignments.push(new Assignment(giver, child));
      } catch (cause) {
        throw new ValidationError(
          `Invalid previous assignment on row ${i + 1} of "${source}": ${
            cause instanceof Error ? cause.message : String(cause)
          }`,
        );
      }
    }

    return assignments;
  }
}

function isFileNotFound(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: string }).code === "ENOENT"
  );
}
