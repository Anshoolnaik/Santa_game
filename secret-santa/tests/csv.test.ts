import { describe, it, expect } from "vitest";
import { parseCsv, toCsv, escapeCsvValue } from "../src/io/csv.js";
import { CsvParseError } from "../src/errors.js";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b\n1,2\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles quoted fields with commas and newlines", () => {
    const text = 'name,note\n"Doe, John","line1\nline2"';
    expect(parseCsv(text)).toEqual([
      ["name", "note"],
      ["Doe, John", "line1\nline2"],
    ]);
  });

  it("handles escaped quotes", () => {
    expect(parseCsv('a\n"she said ""hi"""')).toEqual([["a"], ['she said "hi"']]);
  });

  it("handles CRLF line endings and a trailing newline", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("throws on an unterminated quote", () => {
    expect(() => parseCsv('a,"unterminated')).toThrow(CsvParseError);
  });
});

describe("toCsv / escapeCsvValue", () => {
  it("quotes only values that need it", () => {
    expect(escapeCsvValue("plain")).toBe("plain");
    expect(escapeCsvValue("a,b")).toBe('"a,b"');
    expect(escapeCsvValue('has "quote"')).toBe('"has ""quote"""');
  });

  it("round-trips through parseCsv", () => {
    const rows = [
      ["Employee_Name", "Employee_EmailID"],
      ["Doe, John", 'jo"hn@acme.com'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
