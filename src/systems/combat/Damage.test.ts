import { Rng } from '@core/Rng';
import type { DamageFormula } from '@data/schemas/balance.schema';
import type { Skill } from '@data/schemas/skill.schema';
import { describe, expect, it } from 'vitest';

import { computeDamage } from './Damage';

const formula: DamageFormula = {
  id: 'balance.damage_formula',
  defCoef: 0.5,
  minDamage: 1,
};

const physicalSkill: Skill = {
  id: 'skl.test_phys',
  name: { en: 'Test' },
  unlockLevel: 1,
  cost: { mp: 0, hp: 0, stamina: 0, cooldownMs: 0 },
  power: { coef: 1, base: 0, scaling: 'str' },
  element: 'phys',
  shape: { kind: 'single', range: 10 },
  effects: [],
  tags: [],
};

const fireSkill: Skill = {
  ...physicalSkill,
  id: 'skl.test_fire',
  element: 'fire',
  power: { coef: 1, base: 0, scaling: 'int' },
};

describe('Damage', () => {
  it('uses ATK for physical and MATK for magical skills', () => {
    const rngNoCrit = new Rng(0); // first roll high enough to skip crit
    const physOut = computeDamage({
      attacker: { atk: 50, matk: 5, stat: {}, critPct: 0, critDmg: 1.5 },
      defender: { def: 10, mdef: 0, resistances: {} },
      skill: physicalSkill,
      attackerStatValue: 20,
      formula,
      rng: rngNoCrit,
    });
    expect(physOut.damage).toBeGreaterThan(0);

    const magOut = computeDamage({
      attacker: { atk: 5, matk: 50, stat: {}, critPct: 0, critDmg: 1.5 },
      defender: { def: 0, mdef: 10, resistances: {} },
      skill: fireSkill,
      attackerStatValue: 20,
      formula,
      rng: new Rng(0),
    });
    expect(magOut.damage).toBeGreaterThan(0);
  });

  it('applies element resistance multiplicatively', () => {
    const a = computeDamage({
      attacker: { atk: 0, matk: 100, stat: {}, critPct: 0, critDmg: 1.5 },
      defender: { def: 0, mdef: 0, resistances: { fire: 0.5 } },
      skill: fireSkill,
      attackerStatValue: 0,
      formula,
      rng: new Rng(1),
    });
    const b = computeDamage({
      attacker: { atk: 0, matk: 100, stat: {}, critPct: 0, critDmg: 1.5 },
      defender: { def: 0, mdef: 0, resistances: {} },
      skill: fireSkill,
      attackerStatValue: 0,
      formula,
      rng: new Rng(1),
    });
    expect(a.damage).toBeLessThan(b.damage);
    expect(a.elementMultiplier).toBeCloseTo(0.5, 5);
  });

  it('clamps damage to minDamage', () => {
    const out = computeDamage({
      attacker: { atk: 0, matk: 0, stat: {}, critPct: 0, critDmg: 1.5 },
      defender: { def: 9999, mdef: 0, resistances: {} },
      skill: physicalSkill,
      attackerStatValue: 0,
      formula,
      rng: new Rng(2),
    });
    expect(out.damage).toBe(formula.minDamage);
  });

  it('crits multiply damage by critDmg', () => {
    // critPct = 100 guarantees crit regardless of roll.
    const crit = computeDamage({
      attacker: { atk: 50, matk: 0, stat: {}, critPct: 100, critDmg: 2 },
      defender: { def: 10, mdef: 0, resistances: {} },
      skill: physicalSkill,
      attackerStatValue: 20,
      formula,
      rng: new Rng(3),
    });
    const normal = computeDamage({
      attacker: { atk: 50, matk: 0, stat: {}, critPct: 0, critDmg: 2 },
      defender: { def: 10, mdef: 0, resistances: {} },
      skill: physicalSkill,
      attackerStatValue: 20,
      formula,
      rng: new Rng(3),
    });
    expect(crit.crit).toBe(true);
    expect(normal.crit).toBe(false);
    expect(crit.damage).toBeGreaterThan(normal.damage);
  });
});
