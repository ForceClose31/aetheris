import { describe, expect, it } from 'vitest';

import type { ExpCurve, PlayerBase, StatCurves } from '@data/schemas/balance.schema';

import { Player } from './Player';

const playerBase: PlayerBase = {
  id: 'balance.player_base',
  startingLevel: 1,
  startingStamina: 100,
  base: { hp: 50, mp: 20, str: 5, vit: 5, agi: 5, dex: 5, int: 5, luk: 5 },
};

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

describe('Player', () => {
  it('initializes vitals from playerBase + derived stats', () => {
    const p = new Player(playerBase);
    expect(p.getLevel()).toBe(1);
    expect(p.getHp()).toBeGreaterThan(0);
    expect(p.getMp()).toBeGreaterThan(0);
    expect(p.getStamina()).toBeGreaterThan(0);
  });

  it('awards EXP and triggers level-up with stat growth', () => {
    const p = new Player(playerBase);
    const before = p.getBaseStats();
    p.awardExp(expCurve, statCurves, 1000);
    expect(p.getLevel()).toBeGreaterThan(1);
    expect(p.getBaseStats().hp).toBeGreaterThan(before.hp);
    expect(p.getFreePoints()).toBeGreaterThan(0);
  });

  it('allocates free points onto a stat', () => {
    const p = new Player(playerBase);
    p.awardExp(expCurve, statCurves, 1000);
    const startStr = p.getBaseStats().str;
    const pts = p.getFreePoints();
    expect(p.allocatePoints('str', 3)).toBe(true);
    expect(p.getBaseStats().str).toBe(startStr + 3);
    expect(p.getFreePoints()).toBe(pts - 3);
    expect(p.allocatePoints('str', pts * 100)).toBe(false);
  });

  it('damage reduces HP and heal restores up to max', () => {
    const p = new Player(playerBase);
    const max = p.computeDerived().hp;
    p.damage(20);
    expect(p.getHp()).toBe(max - 20);
    p.heal(9999);
    expect(p.getHp()).toBe(max);
  });

  it('removeModifiersBySource removes only the matching source', () => {
    const p = new Player(playerBase);
    p.addModifier({ stat: 'str', kind: 'flat', value: 5, source: 'gear:sword' });
    p.addModifier({ stat: 'str', kind: 'flat', value: 2, source: 'buff:rage' });
    expect(p.removeModifiersBySource('gear:sword')).toBe(1);
    expect(p.removeModifiersBySource('gear:sword')).toBe(0);
  });
});
