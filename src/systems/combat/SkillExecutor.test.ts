
import { Rng } from '@core/Rng';
import { ContentRegistry } from '@data/registry/ContentRegistry';
import { MonsterInstance } from '@domain/actors/MonsterInstance';
import { Player } from '@domain/actors/Player';
import { CooldownTracker } from '@systems/combat/CooldownTracker';
import { SkillExecutor } from '@systems/combat/SkillExecutor';
import { describe, expect, it } from 'vitest';

import type { DamageFormula, PlayerBase } from '@data/schemas/balance.schema';

const playerBase: PlayerBase = {
  id: 'balance.player_base',
  startingLevel: 1,
  startingStamina: 100,
  base: { hp: 100, mp: 50, str: 20, vit: 10, agi: 10, dex: 10, int: 20, luk: 5 },
};

const formula: DamageFormula = {
  id: 'balance.damage_formula',
  defCoef: 0.5,
  minDamage: 1,
};

const buildRegistry = (): ContentRegistry => {
  const r = new ContentRegistry();
  const result = r.loadAll({
    items: {},
    balance: {
      'balance.player_base': playerBase,
      'balance.exp_curve': {
        id: 'balance.exp_curve',
        formula: 'polynomial',
        a: 50,
        p: 2.4,
        b: 100,
        maxLevel: 200,
      },
      'balance.stat_curves': {
        id: 'balance.stat_curves',
        pointsPerLevel: 5,
        bonusEveryNLevels: 5,
        bonusPoints: 1,
        perLevel: { hp: 8, mp: 4 },
      },
      'balance.damage_formula': formula,
    },
    skills: {
      'skl.basic': {
        id: 'skl.basic',
        name: { en: 'Basic' },
        unlockLevel: 1,
        cost: { stamina: 5, cooldownMs: 200 },
        power: { coef: 1, base: 0, scaling: 'str' },
        element: 'phys',
        shape: { kind: 'single', range: 20 },
        effects: [],
        tags: [],
      },
      'skl.bolt': {
        id: 'skl.bolt',
        name: { en: 'Bolt' },
        unlockLevel: 1,
        cost: { mp: 200, cooldownMs: 200 },
        power: { coef: 1, base: 0, scaling: 'int' },
        element: 'fire',
        shape: { kind: 'single', range: 50 },
        effects: [{ statusId: 'stx.burn', chance: 1 }],
        tags: [],
      },
    },
    statusEffects: {
      'stx.burn': {
        id: 'stx.burn',
        name: { en: 'Burn' },
        tag: 'burn',
        durationMs: 2000,
        stacking: 'refresh',
        maxStacks: 1,
        body: { kind: 'dot', element: 'fire', base: 1, coef: 0, tickIntervalMs: 1000 },
      },
    },
    monsters: {
      'mon.dummy': {
        id: 'mon.dummy',
        name: { en: 'Dummy' },
        family: 'test',
        tier: 1,
        levelRange: [1, 1],
        base: { hp: 30, mp: 0, str: 1, vit: 1, agi: 1, dex: 1, int: 1, luk: 1 },
        growth: { hp: 0, mp: 0, str: 0, vit: 0, agi: 0, dex: 0, int: 0, luk: 0 },
        resistances: {},
        skills: [],
        aiTreeId: 'ai.x',
        lootTableId: 'loot.x',
        size: 'M',
        expReward: 1,
        flags: [],
      },
    },
    lootTables: {
      'loot.x': {
        id: 'loot.x',
        rolls: 1,
        entries: [{ kind: 'nothing', weight: 1 }],
      },
    },
  });
  if (!result.ok) {
    throw new Error('test registry failed: ' + result.error.map((e) => e.message).join('\n'));
  }
  return r;
};

describe('SkillExecutor', () => {
  it('damages the target and applies status on success', () => {
    const r = buildRegistry();
    const cooldowns = new CooldownTracker();
    const exec = new SkillExecutor(r, cooldowns, new Rng(1));
    const player = new Player(playerBase);
    const target = new MonsterInstance(r.requireMonster('mon.dummy'), 1);
    const initialHp = target.getHp();
    const out = exec.execute(player, 'skl.basic', [target], formula);
    expect(out.kind).toBe('ok');
    if (out.kind === 'ok') {
      expect(out.results).toHaveLength(1);
      expect(target.getHp()).toBeLessThan(initialHp);
    }
  });

  it('reports cooldown when called twice immediately', () => {
    const r = buildRegistry();
    const cooldowns = new CooldownTracker();
    const exec = new SkillExecutor(r, cooldowns, new Rng(2));
    const player = new Player(playerBase);
    const target = new MonsterInstance(r.requireMonster('mon.dummy'), 1);
    exec.execute(player, 'skl.basic', [target], formula);
    const second = exec.execute(player, 'skl.basic', [target], formula);
    expect(second.kind).toBe('cooldown');
  });

  it('reports insufficient_mp when cost exceeds player MP', () => {
    const r = buildRegistry();
    const cooldowns = new CooldownTracker();
    const exec = new SkillExecutor(r, cooldowns, new Rng(3));
    const player = new Player(playerBase);
    const target = new MonsterInstance(r.requireMonster('mon.dummy'), 1);
    const out = exec.execute(player, 'skl.bolt', [target], formula);
    expect(out.kind).toBe('insufficient_mp');
  });
});
