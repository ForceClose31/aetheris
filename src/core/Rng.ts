/**
 * Rng - deterministic, seeded random number generator (mulberry32).
 *
 * Each subsystem gets its own seeded Rng so combat / loot / encounters are reproducible
 * and replayable from a save's recorded seeds.
 */

const UINT32_MAX = 0xffffffff;

/** mulberry32: small, fast, decent statistical quality, deterministic. */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Mix a string into a 32-bit seed (FNV-1a). Useful for tag-based sub-streams. */
export const hashSeed = (input: string, base = 0x811c9dc5): number => {
  let h = base >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export class Rng {
  private next01: () => number;

  constructor(public readonly seed: number) {
    this.next01 = mulberry32(seed);
  }

  /** Float in [0, 1). */
  next(): number {
    return this.next01();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) {
      throw new Error(`Rng.int: max (${max}) < min (${min})`);
    }
    return Math.floor(this.next01() * (max - min + 1)) + min;
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return this.next01() * (max - min) + min;
  }

  /** True with probability p (clamped to [0,1]). */
  chance(p: number): boolean {
    return this.next01() < Math.min(1, Math.max(0, p));
  }

  /** Pick one element from a non-empty array. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error('Rng.pick: empty array');
    }
    const v = arr[this.int(0, arr.length - 1)];
    if (v === undefined) {
      throw new Error('Rng.pick: undefined element (sparse array?)');
    }
    return v;
  }

  /** Weighted pick. items must be non-empty and weights non-negative; total > 0. */
  weightedPick<T>(items: readonly { readonly value: T; readonly weight: number }[]): T {
    if (items.length === 0) {
      throw new Error('Rng.weightedPick: empty array');
    }
    let total = 0;
    for (const it of items) {
      if (it.weight < 0 || !Number.isFinite(it.weight)) {
        throw new Error(`Rng.weightedPick: invalid weight ${it.weight}`);
      }
      total += it.weight;
    }
    if (total <= 0) {
      throw new Error('Rng.weightedPick: total weight must be > 0');
    }
    let roll = this.next01() * total;
    for (const it of items) {
      roll -= it.weight;
      if (roll <= 0) {
        return it.value;
      }
    }
    // Fallback for floating-point edge.
    const last = items[items.length - 1];
    if (last === undefined) {
      throw new Error('Rng.weightedPick: empty array (post-iter)');
    }
    return last.value;
  }

  /** Fisher-Yates shuffle, returning a new array. */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }

  /** Spawn a child Rng with a derived seed (deterministic from this seed + tag). */
  fork(tag: string): Rng {
    return new Rng(hashSeed(tag, this.seed));
  }
}

/** Convenience: a freshly seeded global Rng (NOT used for gameplay; use scoped instances). */
export const createRng = (seed: number): Rng => new Rng(seed >>> 0);

export const _internals = { mulberry32, UINT32_MAX };
