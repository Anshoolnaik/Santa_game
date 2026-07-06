/** A function returning a float in [0, 1), matching `Math.random`. */
export type RandomFn = () => number;

/**
 * Deterministic, seedable PRNG (mulberry32). Used so that runs can be made
 * reproducible in tests while still allowing shuffled variety in production
 * (where the seed comes from the clock).
 */
export function createSeededRandom(seed: number): RandomFn {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher–Yates shuffle driven by the supplied RNG. */
export function shuffleInPlace<T>(items: T[], random: RandomFn): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}
