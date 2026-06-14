/**
 * Derived stats - computed from a StatBlock via a single, data-friendly formula.
 *
 * Mirrors GDD section 5.2 (ATK, MATK, DEF, MDEF, ACC, EVA, CRIT%, CRITDMG, SPD).
 * Coefficients live here for Phase 1 but will move to `content/balance/derived.json`
 * once Phase 2 needs to tune combat numbers from data.
 */

import type { StatBlock } from './StatBlock';

export interface DerivedStats {
  readonly atk: number;
  readonly matk: number;
  readonly def: number;
  readonly mdef: number;
  readonly acc: number;
  readonly eva: number;
  readonly critPct: number; // 0..100 (clamped)
  readonly critDmg: number; // multiplier, e.g. 1.5
  readonly spd: number;
  readonly maxStamina: number;
}

export interface DerivedStatsConfig {
  readonly baseStamina: number;
  readonly atkPerStr: number;
  readonly matkPerInt: number;
  readonly defPerVit: number;
  readonly mdefPerInt: number;
  readonly accBase: number;
  readonly accPerDex: number;
  readonly evaBase: number;
  readonly evaPerAgi: number;
  readonly critBase: number;
  readonly critPerLuk: number;
  readonly critDmgBase: number;
  readonly critDmgPerLuk: number;
  readonly spdBase: number;
  readonly spdPerAgi: number;
}

export const DEFAULT_DERIVED_CONFIG: DerivedStatsConfig = {
  baseStamina: 100,
  atkPerStr: 2,
  matkPerInt: 2,
  defPerVit: 1.5,
  mdefPerInt: 1,
  accBase: 75,
  accPerDex: 1,
  evaBase: 5,
  evaPerAgi: 0.5,
  critBase: 1,
  critPerLuk: 0.2,
  critDmgBase: 1.5,
  critDmgPerLuk: 0.005,
  spdBase: 60,
  spdPerAgi: 1,
};

export const computeDerivedStats = (
  block: StatBlock,
  config: DerivedStatsConfig = DEFAULT_DERIVED_CONFIG,
): DerivedStats => ({
  atk: Math.floor(block.str * config.atkPerStr),
  matk: Math.floor(block.int * config.matkPerInt),
  def: Math.floor(block.vit * config.defPerVit),
  mdef: Math.floor(block.int * config.mdefPerInt),
  acc: Math.floor(config.accBase + block.dex * config.accPerDex),
  eva: Math.floor(config.evaBase + block.agi * config.evaPerAgi),
  critPct: Math.min(100, Math.max(0, config.critBase + block.luk * config.critPerLuk)),
  critDmg: config.critDmgBase + block.luk * config.critDmgPerLuk,
  spd: Math.floor(config.spdBase + block.agi * config.spdPerAgi),
  maxStamina: Math.floor(config.baseStamina + block.vit * 1),
});
