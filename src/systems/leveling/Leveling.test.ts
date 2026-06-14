import type { ExpCurve, StatCurves } from '@data/schemas/balance.schema';
import { describe, expect, it } from 'vitest';


import {
  applyExp,
  applyStatGrowth,
  computeLevelAward,
  expToNext,
  totalExpFor,
} from './Leveling';

const expCurve: ExpCurve = {
  id: 'balance.exp_curve',
  formula: 'polynomial',
  a: 50,
  p: 2.4,
  b: 100,
  maxLevel: 200,
};

const statCurves: StatCurves = {
  id: 'balance.stat_curves',
  pointsPerLevel: 5,
  bonusEveryNLevels: 5,
  bonusPoints: 1,
  perLevel: { hp: 8, mp: 4 },
};

describe('Leveling', () => {
  it('expToNext follows the polynomial formula', () => {
    // L=1 -> floor(50 * 1^2.4 + 100 * 1) = 150
    expect(expToNext(expCurve, 1)).toBe(150);
    // L=10 -> floor(50 * 10^2.4 + 100 * 10) = floor(50 * 251.18... + 1000)
    expect(expToNext(expCurve, 10)).toBe(Math.floor(50 * Math.pow(10, 2.4) + 100 * 10));
  });

  it('returns Infinity at max level', () => {
    expect(expToNext(expCurve, 200)).toBe(Number.POSITIVE_INFINITY);
  });

  it('totalExpFor accumulates correctly', () => {
    const sum = expToNext(expCurve, 1) + expToNext(expCurve, 2) + expToNext(expCurve, 3);
    expect(totalExpFor(expCurve, 4)).toBe(sum);
  });

  it('computeLevelAward yields per-level growth and bonus points', () => {
    const a = computeLevelAward(statCurves, 1, 6);
    // 5 level-ups, 5 points each = 25, plus +1 bonus at level 5.
    expect(a.freePoints).toBe(26);
    expect(a.statGrowth.hp).toBe(40);
    expect(a.statGrowth.mp).toBe(20);
  });

  it('applyExp rolls over multiple level-ups in one award', () => {
    const start = { level: 1, exp: 0, freePoints: 0 };
    const huge = expToNext(expCurve, 1) + expToNext(expCurve, 2) + 5;
    const r = applyExp(expCurve, statCurves, start, huge);
    expect(r.leveledUp).toBe(true);
    expect(r.state.level).toBe(3);
    expect(r.state.exp).toBe(5);
    expect(r.state.freePoints).toBe(10); // 2 levels * 5 pts
  });

  it('applyExp stops at max level', () => {
    const r = applyExp(expCurve, statCurves, { level: 200, exp: 0, freePoints: 0 }, 1_000_000);
    expect(r.state.level).toBe(200);
    expect(r.state.exp).toBe(0);
  });

  it('applyStatGrowth adds growth additively', () => {
    const out = applyStatGrowth(
      { hp: 50, mp: 20, str: 5, vit: 5, agi: 5, dex: 5, int: 5, luk: 5 },
      { hp: 8, mp: 4 },
    );
    expect(out.hp).toBe(58);
    expect(out.mp).toBe(24);
  });

  it('rejects invalid arguments', () => {
    expect(() => expToNext(expCurve, 0)).toThrow();
    expect(() => computeLevelAward(statCurves, 5, 4)).toThrow();
    expect(() =>
      applyExp(expCurve, statCurves, { level: 1, exp: 0, freePoints: 0 }, -1),
    ).toThrow();
  });
});
