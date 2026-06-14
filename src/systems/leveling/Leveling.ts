/**
 * Leveling system - EXP curve, level-up rules, and free-point bookkeeping.
 *
 * All formulas are data-driven; this module is the only place that knows how
 * to interpret the `polynomial` formula. Adding a new formula type means a new
 * branch here and a wider Zod union in `balance.schema.ts`.
 */

import type { StatBlock, StatKey } from '@domain/actors/StatBlock';

import type { ExpCurve, StatCurves } from '@data/schemas/balance.schema';

export interface LevelUpAward {
  readonly fromLevel: number;
  readonly toLevel: number;
  readonly statGrowth: Partial<Record<StatKey, number>>;
  readonly freePoints: number;
}

export interface LevelState {
  readonly level: number;
  readonly exp: number;
  readonly freePoints: number;
}

/** EXP needed to advance from `level` to `level + 1`, or `Infinity` at cap. */
export const expToNext = (curve: ExpCurve, level: number): number => {
  if (level < 1) {
    throw new Error(`expToNext: level must be >= 1 (got ${level})`);
  }
  if (level >= curve.maxLevel) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor(curve.a * Math.pow(level, curve.p) + curve.b * level);
};

/** Total EXP needed to reach `level` from level 1. */
export const totalExpFor = (curve: ExpCurve, level: number): number => {
  if (level <= 1) {
    return 0;
  }
  let sum = 0;
  for (let l = 1; l < level && l < curve.maxLevel; l++) {
    sum += expToNext(curve, l);
  }
  return sum;
};

const cloneAdd = (
  base: Partial<Record<StatKey, number>>,
  delta: Partial<Record<StatKey, number>>,
): Partial<Record<StatKey, number>> => {
  const out: Partial<Record<StatKey, number>> = { ...base };
  const keys = Object.keys(delta) as StatKey[];
  for (const k of keys) {
    const d = delta[k];
    if (d === undefined) {
      continue;
    }
    out[k] = (out[k] ?? 0) + d;
  }
  return out;
};

/**
 * Award the player the appropriate stat growth and free points for advancing
 * `fromLevel -> toLevel`. Multiple level-ups in one EXP gain are aggregated.
 */
export const computeLevelAward = (
  curves: StatCurves,
  fromLevel: number,
  toLevel: number,
): LevelUpAward => {
  if (toLevel < fromLevel) {
    throw new Error(`computeLevelAward: toLevel < fromLevel (${toLevel} < ${fromLevel})`);
  }
  let growth: Partial<Record<StatKey, number>> = {};
  let points = 0;
  for (let l = fromLevel + 1; l <= toLevel; l++) {
    growth = cloneAdd(growth, curves.perLevel);
    points += curves.pointsPerLevel;
    if (l % curves.bonusEveryNLevels === 0) {
      points += curves.bonusPoints;
    }
  }
  return { fromLevel, toLevel, statGrowth: growth, freePoints: points };
};

export interface ApplyExpResult {
  readonly state: LevelState;
  readonly award: LevelUpAward | null;
  readonly leveledUp: boolean;
}

/** Apply `expGain` to `current`, rolling level forward as many times as possible. */
export const applyExp = (
  curve: ExpCurve,
  curves: StatCurves,
  current: LevelState,
  expGain: number,
): ApplyExpResult => {
  if (expGain < 0) {
    throw new Error(`applyExp: expGain must be >= 0 (got ${expGain})`);
  }
  let level = current.level;
  let exp = current.exp + expGain;
  let freePoints = current.freePoints;
  let leveled = false;
  let totalGrowth: Partial<Record<StatKey, number>> = {};

  while (level < curve.maxLevel) {
    const need = expToNext(curve, level);
    if (exp < need) {
      break;
    }
    exp -= need;
    const award = computeLevelAward(curves, level, level + 1);
    level += 1;
    freePoints += award.freePoints;
    totalGrowth = cloneAdd(totalGrowth, award.statGrowth);
    leveled = true;
  }

  if (level >= curve.maxLevel) {
    exp = 0;
  }

  return {
    state: { level, exp, freePoints },
    award: leveled
      ? { fromLevel: current.level, toLevel: level, statGrowth: totalGrowth, freePoints }
      : null,
    leveledUp: leveled,
  };
};

/** Apply per-level stat growth (without modifiers) onto a StatBlock. */
export const applyStatGrowth = (
  block: StatBlock,
  growth: Partial<Record<StatKey, number>>,
): StatBlock => {
  const out: { [K in StatKey]: number } = { ...block };
  const keys = Object.keys(growth) as StatKey[];
  for (const k of keys) {
    const d = growth[k];
    if (d === undefined) {
      continue;
    }
    out[k] = (out[k] ?? 0) + d;
  }
  return out;
};
