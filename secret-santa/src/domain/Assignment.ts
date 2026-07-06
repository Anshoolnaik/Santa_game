import { Employee } from "./Employee.js";

/**
 * A single Secret Santa pairing: `giver` anonymously gifts `child`.
 * ("child" is the challenge's term for the gift recipient / "secret child".)
 */
export class Assignment {
  constructor(
    public readonly giver: Employee,
    public readonly child: Employee,
  ) {
    if (giver.equals(child)) {
      throw new Error(
        `Invalid assignment: ${giver} cannot be their own secret child.`,
      );
    }
  }

  toString(): string {
    return `${this.giver.name} -> ${this.child.name}`;
  }
}
