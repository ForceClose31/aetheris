/**
 * Balance configuration entry points.
 *
 * Values here are pointers to data files; do not bake numbers into source code.
 * Real curves live under `content/balance/*.json`.
 */

export const BALANCE_PATHS = {
  expCurve: 'content/balance/exp_curve.json',
  statCurves: 'content/balance/stat_curves.json',
  damageFormula: 'content/balance/damage_formula.json',
  lootRolls: 'content/balance/loot_rolls.json',
} as const;
