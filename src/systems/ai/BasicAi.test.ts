import { MonsterInstance } from '@domain/actors/MonsterInstance';
import { describe, expect, it } from 'vitest';

import type { Monster } from '@data/schemas/monster.schema';

import { BasicAi, DEFAULT_AI_TUNING } from './BasicAi';

const goblin: Monster = {
  id: 'mon.goblin_test',
  name: { en: 'Goblin' },
  family: 'goblin',
  tier: 1,
  levelRange: [1, 5],
  base: { hp: 20, mp: 0, str: 5, vit: 3, agi: 3, dex: 3, int: 1, luk: 1 },
  growth: { hp: 5, mp: 0, str: 1, vit: 1, agi: 1, dex: 0, int: 0, luk: 0 },
  resistances: {},
  skills: ['skl.x'],
  aiTreeId: 'ai.basic_chaser',
  lootTableId: 'loot.x',
  size: 'M',
  expReward: 10,
  flags: [],
};

describe('BasicAi', () => {
  it('idles when out of aggro range', () => {
    const inst = new MonsterInstance(goblin, 1);
    const ai = new BasicAi(inst);
    const out = ai.step({
      distanceToPlayer: 999,
      hpRatio: 1,
      canAttack: false,
      deltaMs: 0,
    });
    expect(out.state).toBe('idle');
    expect(out.moveTowardPlayer).toBe(0);
  });

  it('chases inside aggroRange but outside attackRange', () => {
    const inst = new MonsterInstance(goblin, 1);
    const ai = new BasicAi(inst);
    // Get past the reaction cooldown.
    ai.step({ distanceToPlayer: 60, hpRatio: 1, canAttack: false, deltaMs: 200 });
    const out = ai.step({ distanceToPlayer: 60, hpRatio: 1, canAttack: false, deltaMs: 200 });
    expect(out.state).toBe('chase');
    expect(out.moveTowardPlayer).toBe(1);
  });

  it('attacks when in attack range and canAttack is true', () => {
    const inst = new MonsterInstance(goblin, 1);
    const ai = new BasicAi(inst);
    ai.step({ distanceToPlayer: 10, hpRatio: 1, canAttack: true, deltaMs: 200 });
    const out = ai.step({ distanceToPlayer: 10, hpRatio: 1, canAttack: true, deltaMs: 200 });
    expect(out.state).toBe('attack');
    expect(out.attack).toBe(true);
  });

  it('flees when hpRatio drops below threshold', () => {
    const inst = new MonsterInstance(goblin, 1);
    const ai = new BasicAi(inst, { ...DEFAULT_AI_TUNING, fleeHpRatio: 0.4 });
    ai.step({ distanceToPlayer: 30, hpRatio: 0.2, canAttack: false, deltaMs: 200 });
    const out = ai.step({
      distanceToPlayer: 30,
      hpRatio: 0.2,
      canAttack: false,
      deltaMs: 200,
    });
    expect(out.state).toBe('flee');
    expect(out.moveTowardPlayer).toBeLessThan(0);
  });
});
