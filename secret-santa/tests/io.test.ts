import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Employee } from "../src/domain/Employee.js";
import { Assignment } from "../src/domain/Assignment.js";
import { CsvEmployeeReader } from "../src/io/CsvEmployeeReader.js";
import { CsvAssignmentReader } from "../src/io/CsvAssignmentReader.js";
import { CsvAssignmentWriter } from "../src/io/CsvAssignmentWriter.js";
import { parseCsv } from "../src/io/csv.js";
import { CsvParseError, FileReadError, ValidationError } from "../src/errors.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "secret-santa-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string, content: string): string {
  const p = join(dir, name);
  writeFileSync(p, content, "utf-8");
  return p;
}

describe("CsvEmployeeReader", () => {
  it("reads a valid roster (tolerating BOM and column order)", () => {
    const p = write(
      "emp.csv",
      "﻿Employee_EmailID,Employee_Name\nada@acme.com,Ada\nbob@acme.com,Bob\n",
    );
    const employees = new CsvEmployeeReader().read(p);
    expect(employees.map((e) => e.name)).toEqual(["Ada", "Bob"]);
  });

  it("keeps duplicate names with distinct emails as separate people", () => {
    const p = write(
      "emp.csv",
      "Employee_Name,Employee_EmailID\nHamish Murray,h1@acme.com\nHamish Murray,h2@acme.com\n",
    );
    expect(new CsvEmployeeReader().read(p)).toHaveLength(2);
  });

  it("rejects duplicate emails", () => {
    const p = write(
      "emp.csv",
      "Employee_Name,Employee_EmailID\nAda,dup@acme.com\nBob,dup@acme.com\n",
    );
    expect(() => new CsvEmployeeReader().read(p)).toThrow(ValidationError);
  });

  it("rejects a missing required column", () => {
    const p = write("emp.csv", "Name,Email\nAda,ada@acme.com\n");
    expect(() => new CsvEmployeeReader().read(p)).toThrow(CsvParseError);
  });

  it("throws FileReadError for a missing file", () => {
    expect(() => new CsvEmployeeReader().read(join(dir, "nope.csv"))).toThrow(
      FileReadError,
    );
  });
});

describe("CsvAssignmentReader", () => {
  it("returns [] for a missing optional previous-year file", () => {
    expect(new CsvAssignmentReader().read(join(dir, "none.csv"))).toEqual([]);
  });

  it("reads previous assignments", () => {
    const p = write(
      "prev.csv",
      "Employee_Name,Employee_EmailID,Secret_Child_Name,Secret_Child_EmailID\n" +
        "Ada,ada@acme.com,Bob,bob@acme.com\n",
    );
    const prev = new CsvAssignmentReader().read(p);
    expect(prev).toHaveLength(1);
    expect(prev[0]!.giver.email).toBe("ada@acme.com");
    expect(prev[0]!.child.email).toBe("bob@acme.com");
  });
});

describe("CsvAssignmentWriter", () => {
  it("writes the required 4-column format, creating directories", () => {
    const target = join(dir, "nested", "out.csv");
    const assignments = [
      new Assignment(
        new Employee("Ada", "ada@acme.com"),
        new Employee("Bob", "bob@acme.com"),
      ),
    ];
    new CsvAssignmentWriter().write(target, assignments);

    const rows = parseCsv(readFileSync(target, "utf-8"));
    expect(rows[0]).toEqual([
      "Employee_Name",
      "Employee_EmailID",
      "Secret_Child_Name",
      "Secret_Child_EmailID",
    ]);
    expect(rows[1]).toEqual(["Ada", "ada@acme.com", "Bob", "bob@acme.com"]);
  });
});
