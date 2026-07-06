import { readFileSync } from "node:fs";
import { Employee } from "../domain/Employee.js";
import { CsvParseError, FileReadError, ValidationError } from "../errors.js";
import { EmployeeReader } from "./ports.js";
import { parseCsv } from "./csv.js";
import { buildHeaderIndex } from "./headers.js";

const NAME = "Employee_Name";
const EMAIL = "Employee_EmailID";

/** Reads the employee roster from a CSV file. */
export class CsvEmployeeReader implements EmployeeReader {
  read(source: string): Employee[] {
    let text: string;
    try {
      text = readFileSync(source, "utf-8");
    } catch (cause) {
      throw new FileReadError(source, cause);
    }

    const rows = parseCsv(text.replace(/^﻿/, "")); // strip BOM
    if (rows.length === 0) {
      throw new CsvParseError(`Employee file "${source}" is empty.`);
    }

    const header = buildHeaderIndex(rows[0]!, [NAME, EMAIL], source);
    const employees: Employee[] = [];
    const seenEmails = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      if (row.every((cell) => cell.trim() === "")) continue; // skip blank lines

      let employee: Employee;
      try {
        employee = new Employee(
          row[header[NAME]!] ?? "",
          row[header[EMAIL]!] ?? "",
        );
      } catch (cause) {
        throw new ValidationError(
          `Invalid employee on row ${i + 1} of "${source}": ${
            cause instanceof Error ? cause.message : String(cause)
          }`,
        );
      }

      if (seenEmails.has(employee.id)) {
        throw new ValidationError(
          `Duplicate employee email "${employee.email}" on row ${
            i + 1
          } of "${source}". Emails must be unique.`,
        );
      }
      seenEmails.add(employee.id);
      employees.push(employee);
    }

    if (employees.length === 0) {
      throw new ValidationError(
        `Employee file "${source}" contains a header but no employees.`,
      );
    }

    return employees;
  }
}
