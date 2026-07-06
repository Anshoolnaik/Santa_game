import { Employee } from "../domain/Employee.js";
import { Assignment } from "../domain/Assignment.js";
import { AssignmentConstraint } from "../constraints/AssignmentConstraint.js";
import { NoValidAssignmentError } from "../errors.js";
import {
  RandomFn,
  shuffleInPlace,
  createSeededRandom,
} from "../util/random.js";
import { AssignmentStrategy } from "./AssignmentStrategy.js";

/**
 * Assigns secret children by modelling the problem as maximum bipartite
 * matching and solving it with Kuhn's augmenting-path algorithm.
 *
 * Why matching instead of random-shuffle-and-retry?
 *   - Reliability: if a valid full assignment exists, this ALWAYS finds one.
 *     Random retry can fail to converge on tightly constrained rosters and has
 *     no clean termination guarantee.
 *   - Efficiency: O(V * E) worst case, which is comfortable for company-sized
 *     rosters.
 *
 * Left vertices = givers, right vertices = candidate children (same people).
 * An edge giver->child exists iff every constraint permits the pairing. A
 * perfect matching (size === n) is a valid Secret Santa assignment. If the
 * maximum matching is smaller than the roster, no valid assignment exists.
 *
 * Candidate lists are shuffled with an injectable RNG so results vary year to
 * year, while tests can pass a fixed seed for determinism.
 */
export class BipartiteMatchingStrategy implements AssignmentStrategy {
  private readonly random: RandomFn;

  constructor(random?: RandomFn) {
    // Default seed is fixed so behaviour is deterministic unless a caller
    // (e.g. the CLI) deliberately supplies a clock-based RNG.
    this.random = random ?? createSeededRandom(0x5eed);
  }

  assign(
    employees: readonly Employee[],
    constraints: readonly AssignmentConstraint[],
  ): Assignment[] {
    const n = employees.length;
    if (n < 2) {
      throw new NoValidAssignmentError(
        `A Secret Santa event needs at least 2 employees, but got ${n}.`,
      );
    }

    const adjacency = this.buildAdjacency(employees, constraints);

    // matchGiverForChild[c] = index of giver currently matched to child c, or -1.
    const matchGiverForChild = new Array<number>(n).fill(-1);

    for (let giver = 0; giver < n; giver++) {
      const seen = new Array<boolean>(n).fill(false);
      if (!this.tryAugment(giver, adjacency, matchGiverForChild, seen)) {
        throw this.unsolvable(employees, adjacency);
      }
    }

    // Invert the child->giver matching into giver-ordered assignments.
    const childForGiver = new Array<number>(n).fill(-1);
    for (let child = 0; child < n; child++) {
      const giver = matchGiverForChild[child]!;
      childForGiver[giver] = child;
    }

    return childForGiver.map(
      (child, giver) => new Assignment(employees[giver]!, employees[child]!),
    );
  }

  /** For each giver, the shuffled list of child indices it may be paired with. */
  private buildAdjacency(
    employees: readonly Employee[],
    constraints: readonly AssignmentConstraint[],
  ): number[][] {
    const n = employees.length;
    const adjacency: number[][] = [];

    for (let giver = 0; giver < n; giver++) {
      const candidates: number[] = [];
      for (let child = 0; child < n; child++) {
        const allowed = constraints.every((c) =>
          c.isAllowed(employees[giver]!, employees[child]!),
        );
        if (allowed) candidates.push(child);
      }
      adjacency.push(shuffleInPlace(candidates, this.random));
    }
    return adjacency;
  }

  /** Kuhn's DFS: try to find an augmenting path for `giver`. */
  private tryAugment(
    giver: number,
    adjacency: number[][],
    matchGiverForChild: number[],
    seen: boolean[],
  ): boolean {
    for (const child of adjacency[giver]!) {
      if (seen[child]) continue;
      seen[child] = true;

      const currentGiver = matchGiverForChild[child]!;
      if (
        currentGiver === -1 ||
        this.tryAugment(currentGiver, adjacency, matchGiverForChild, seen)
      ) {
        matchGiverForChild[child] = giver;
        return true;
      }
    }
    return false;
  }

  private unsolvable(
    employees: readonly Employee[],
    adjacency: number[][],
  ): NoValidAssignmentError {
    const stranded = adjacency
      .map((candidates, giver) => ({ giver, count: candidates.length }))
      .filter((x) => x.count === 0)
      .map((x) => employees[x.giver]!.name);

    const detail =
      stranded.length > 0
        ? ` Employees with no eligible secret child: ${stranded.join(", ")}.`
        : " The constraints cannot all be satisfied simultaneously.";

    return new NoValidAssignmentError(
      `No valid Secret Santa assignment exists for this roster.${detail}`,
    );
  }
}
