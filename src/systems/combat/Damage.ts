/**
 * Damage formula - data-driven physical/magical damage with element multiplier and crit.
 *
 * Mirrors GDD section 6.4. Values come from `content/balance/damage_formula.json`
 * plus the attacker/defender stats; this module is the only place that actually
 * crunches the numbers.
 */

import type { Rng } from '@core/Rng';
import type { DamageFormula } from '@data/schemas/balance.schema';
import type { Skill } from '@data/schemas/skill.schema';
import type { DerivedStats } from '@domain/actors/DerivedStats';
import type { Element } from '@domain/actors/StatBlock';

export interface AttackerProfile {
  readonly atk: number;
  readonly matk: number;
  readonly stat: Record<keyof DerivedStats | string, number>; // for skill scaling lookup
  readonly critPct: number; // 0..100
  readonly critDmg: number; // multiplier
}

export interface DefenderProfile {
  readonly def: number;
  readonly mdef: number;
  readonly resistances: Partial<Record<Element, number>>;
}

export interface DamageInput {
  readonly attacker: AttackerProfile;
  readonly defender: DefenderProfile;
  readonly skill: Skill;
  readonly attackerStatValue: number; // value of the stat skill scales from
  readonly formula: DamageFormula;
  readonly rng: Rng;
}

export interface DamageOutput {
  readonly damage: number;
  readonly crit: boolean;
  readonly elementMultiplier: number; // 1 + (-resistance) before clamp
}

const isMagical = (element: Element): boolean =>
  element === 'fire' ||
  element === 'ice' ||
  element === 'lightning' ||
  element === 'earth' ||
  element === 'holy' ||
  element === 'dark' ||
  element === 'void';

export const computeDamage = (input: DamageInput): DamageOutput => {
  const { skill, attacker, defender, formula, rng, attackerStatValue } = input;

  const offense = isMagical(skill.element) ? attacker.matk : attacker.atk;
  const defense = isMagical(skill.element) ? defender.mdef : defender.def;

  const power = skill.power.base + skill.power.coef * (offense + attackerStatValue * 0.5);
  const resist = defender.resistances[skill.element] ?? 0;
  const elementMultiplier = Math.max(0, 1 - resist);

  let base = power - defense * formula.defCoef;
  base = Math.max(0, base) * elementMultiplier;

  const critRoll = rng.next() * 100;
  const crit = critRoll < attacker.critPct;
  if (crit) {
    base *= attacker.critDmg;
  }

  const damage = Math.max(formula.minDamage, Math.floor(base));
  return { damage, crit, elementMultiplier };
};
