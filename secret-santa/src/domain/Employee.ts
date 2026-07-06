/**
 * An employee participating in the Secret Santa event.
 *
 * Identity is defined by the email address (case-insensitive), NOT the name.
 * This matters because the roster legitimately contains several people who
 * share a display name (e.g. three different "Hamish Murray") but each has a
 * unique corporate email.
 */
export class Employee {
  public readonly name: string;
  public readonly email: string;

  constructor(name: string, email: string) {
    const trimmedName = name?.trim() ?? "";
    const trimmedEmail = email?.trim() ?? "";

    if (trimmedName.length === 0) {
      throw new Error("Employee name must not be empty.");
    }
    if (trimmedEmail.length === 0) {
      throw new Error(`Employee "${trimmedName}" is missing an email address.`);
    }

    this.name = trimmedName;
    this.email = trimmedEmail;
  }

  /** Stable, case-insensitive identity key derived from the email. */
  get id(): string {
    return this.email.toLowerCase();
  }

  equals(other: Employee): boolean {
    return this.id === other.id;
  }

  toString(): string {
    return `${this.name} <${this.email}>`;
  }
}
