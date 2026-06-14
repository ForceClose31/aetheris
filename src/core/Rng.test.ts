import { describe, expect, it } from 'vitest';

import { hashSeed, Rng } from './Rng';

describe('Rng', () => {
  it('produces deterministic sequences for the same seed', () => {
    const a = new Rng(123).shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    const b = new Rng(123).shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(a).toEqual(b);
  });

  it('differs for different seeds (with overwhelming probability)', () => {
    const a = Array.from({ length: 32 }, () => new Rng(1).int(0, 1_000_000));
    const b = Array.from({ length: 32 }, () => new Rng(2).int(0, 1_000_000));
    // The two streams must not be identical.
    expect(a).not.toEqual(b);
  });

  it('keeps int() within bounds', () => {
    const r = new Rng(42);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(-3, 5);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('weightedPick respects weights statistically', () => {
    const r = new Rng(7);
    const items = [
      { value: 'A', weight: 1 },
      { value: 'B', weight: 9 },
    ];
    let countB = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      if (r.weightedPick(items) === 'B') {
        countB++;
      }
    }
    // 90% expected; allow a generous band.
    expect(countB / N).toBeGreaterThan(0.85);
    expect(countB / N).toBeLessThan(0.95);
  });

  it('chance(0) is always false and chance(1) is always true', () => {
    const r = new Rng(99);
    for (let i = 0; i < 100; i++) {
      expect(r.chance(0)).toBe(false);
      expect(r.chance(1)).toBe(true);
    }
  });

  it('fork() produces deterministic, distinct child streams', () => {
    const parent = new Rng(2024);
    const childA1 = parent.fork('combat').int(0, 1_000_000);
    const childA2 = new Rng(2024).fork('combat').int(0, 1_000_000);
    const childB = parent.fork('loot').int(0, 1_000_000);
    expect(childA1).toBe(childA2);
    expect(childA1).not.toBe(childB);
  });

  it('hashSeed is deterministic and stable', () => {
    expect(hashSeed('foo')).toBe(hashSeed('foo'));
    expect(hashSeed('foo')).not.toBe(hashSeed('bar'));
  });

  it('throws on invalid arguments', () => {
    const r = new Rng(1);
    expect(() => r.int(5, 1)).toThrow();
    expect(() => r.pick([])).toThrow();
    expect(() => r.weightedPick([])).toThrow();
    expect(() => r.weightedPick([{ value: 'x', weight: 0 }])).toThrow();
  });
});
