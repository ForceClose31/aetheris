/**
 * Balance schemas - data-driven tuning for EXP, stat growth, and player baseline.
 *
 * Files live under `content/balance/`. The validator and registry parse them with
 * the same Zod schemas declared here, so adjusting numbers never touches engine code.
 */

import { PARTIAL_STAT_BLOCK_SCHEMA, STAT_BLOCK_SCHEMA } from '@domain/actors/StatBlock';
import { z } from 'zod';


/**
 * EXP-to-next-level curve. We use a closed-form formula `floor(a * L^p + b * L)`,
 * matching GDD section 7. Keeping it as data lets us swap to a CSV table later.
 */
export const EXP_CURVE_SCHEMA = z
  .object({
    id: z.literal('balance.exp_curve'),
    formula: z.literal('polynomial'),
    a: z.number().positive(),
    p: z.number().positive(),
    b: z.number().nonnegative(),
    /** Inclusive max level. EXP-to-next is undefined at this level. */
    maxLevel: z.number().int().min(2).max(500),
  })
  .strict();
export type ExpCurve = z.infer<typeof EXP_CURVE_SCHEMA>;

/**
 * Per-level stat growth and free-point allocation rules.
 * `perLevel` is added every level; `every5Bonus` is a bonus block every 5 levels.
 */
export const STAT_CURVES_SCHEMA = z
  .object({
    id: z.literal('balance.stat_curves'),
    pointsPerLevel: z.number().int().min(0).max(20),
    bonusEveryNLevels: z.number().int().min(1),
    bonusPoints: z.number().int().min(0).max(20),
    /** Auto-applied stat growth from level alone (independent of free points). */
    perLevel: PARTIAL_STAT_BLOCK_SCHEMA,
  })
  .strict();
export type StatCurves = z.infer<typeof STAT_CURVES_SCHEMA>;

/** Starting baseline for a fresh player at level 1, before any allocation. */
export const PLAYER_BASE_SCHEMA = z
  .object({
    id: z.literal('balance.player_base'),
    startingLevel: z.number().int().min(1),
    startingStamina: z.number().int().min(1),
    base: STAT_BLOCK_SCHEMA,
  })
  .strict();
export type PlayerBase = z.infer<typeof PLAYER_BASE_SCHEMA>;

/**
 * Damage formula coefficients - stub for Phase 2; included so balance content can
 * already be authored without adding a new file in a future phase.
 */
export const DAMAGE_FORMULA_SCHEMA = z
  .object({
    id: z.literal('balance.damage_formula'),
    defCoef: z.number().min(0).max(1),
    minDamage: z.number().int().min(0),
  })
  .strict();
export type DamageFormula = z.infer<typeof DAMAGE_FORMULA_SCHEMA>;
