import { CsvParseError } from "../errors.js";

/**
 * Map required column names to their positions in a CSV header row.
 * Matching is case-insensitive and whitespace-tolerant. Throws if any
 * required column is missing.
 */
export function buildHeaderIndex(
  headerRow: readonly string[],
  required: readonly string[],
  source: string,
): Record<string, number> {
  const normalized = headerRow.map((h) => h.trim().toLowerCase());
  const index: Record<string, number> = {};

  for (const column of required) {
    const pos = normalized.indexOf(column.toLowerCase());
    if (pos === -1) {
      throw new CsvParseError(
        `Missing required column "${column}" in "${source}". ` +
          `Found columns: ${headerRow.map((h) => h.trim()).join(", ")}.`,
      );
    }
    index[column] = pos;
  }
  return index;
}
