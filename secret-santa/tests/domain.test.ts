import { describe, it, expect } from "vitest";
import { Employee } from "../src/domain/Employee.js";
import { Assignment } from "../src/domain/Assignment.js";

describe("Employee", () => {
  it("trims name and email", () => {
    const e = new Employee("  Ada Lovelace  ", "  ada@acme.com ");
    expect(e.name).toBe("Ada Lovelace");
    expect(e.email).toBe("ada@acme.com");
  });

  it("uses a case-insensitive email as identity, not the name", () => {
    // Two real people who share a display name but differ by email.
    const a = new Employee("Hamish Murray", "hamish.murray@acme.com");
    const b = new Employee("Hamish Murray", "hamish.murray.jr@acme.com");
    expect(a.equals(b)).toBe(false);

    const c = new Employee("Hamish Murray", "HAMISH.MURRAY@ACME.COM");
    expect(a.equals(c)).toBe(true);
  });

  it("rejects empty name or email", () => {
    expect(() => new Employee("", "x@acme.com")).toThrow();
    expect(() => new Employee("X", "  ")).toThrow();
  });
});

describe("Assignment", () => {
  it("rejects self-assignment at construction time", () => {
    const a = new Employee("Ada", "ada@acme.com");
    expect(() => new Assignment(a, a)).toThrow(/own secret child/);
  });
});
