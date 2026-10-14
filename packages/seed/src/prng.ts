/** mulberry32 — tiny deterministic PRNG so the demo profile is reproducible. */
export function createPrng(seed: number) {
  let a = seed >>> 0;
  function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    int(maxExclusive: number): number {
      return Math.floor(next() * maxExclusive);
    },
    range(min: number, max: number): number {
      return min + next() * (max - min);
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)] as T;
    },
    chance(probability: number): boolean {
      return next() < probability;
    },
  };
}

export type Prng = ReturnType<typeof createPrng>;
