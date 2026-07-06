/**
 * Domain-specific error hierarchy. Catching `SecretSantaError` lets the CLI
 * distinguish expected, actionable failures (bad file, unsolvable roster) from
 * unexpected programming bugs.
 */
export class SecretSantaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A required file could not be read from disk. */
export class FileReadError extends SecretSantaError {
  constructor(path: string, cause?: unknown) {
    super(
      `Could not read file "${path}"${
        cause instanceof Error ? `: ${cause.message}` : ""
      }`,
    );
  }
}

/** A CSV file was malformed (missing headers, wrong column count, etc.). */
export class CsvParseError extends SecretSantaError {}

/** The roster or previous-year data violated a validation rule. */
export class ValidationError extends SecretSantaError {}

/**
 * No assignment satisfies every constraint for the given roster.
 * (e.g. only 1 employee, or previous-year rules leave someone with no
 * eligible child.)
 */
export class NoValidAssignmentError extends SecretSantaError {}
