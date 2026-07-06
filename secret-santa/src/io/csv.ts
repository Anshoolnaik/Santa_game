import { CsvParseError } from "../errors.js";

/**
 * Minimal, dependency-free RFC-4180-style CSV support.
 *
 * Handles: quoted fields, commas and newlines inside quotes, escaped quotes
 * ("" -> "), CRLF or LF line endings, and a trailing newline. Kept small on
 * purpose — the challenge input is simple, and avoiding a heavy CSV dependency
 * keeps the solution easy to audit.
 */

/** Parse CSV text into an array of rows, each row an array of string cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let fieldStarted = false;

  const endField = () => {
    row.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // consume the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    switch (ch) {
      case '"':
        if (fieldStarted && field.length > 0) {
          throw new CsvParseError(
            "Unexpected quote in the middle of an unquoted field.",
          );
        }
        inQuotes = true;
        fieldStarted = true;
        break;
      case ",":
        endField();
        break;
      case "\r":
        break; // ignore; handled by the following \n (or end of text)
      case "\n":
        endRow();
        break;
      default:
        field += ch;
        fieldStarted = true;
    }
  }

  if (inQuotes) {
    throw new CsvParseError("Unterminated quoted field in CSV input.");
  }

  // Flush the final field/row unless the text ended exactly on a newline.
  if (field.length > 0 || row.length > 0 || fieldStarted) {
    endRow();
  }

  return rows;
}

/** Escape a single value for CSV output, quoting only when necessary. */
export function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serialise rows (header + data) into CSV text with CRLF line endings. */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((r) => r.map(escapeCsvValue).join(",")).join("\r\n") + "\r\n";
}
