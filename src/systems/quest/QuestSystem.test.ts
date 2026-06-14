
import { ContentRegistry } from '@data/registry/ContentRegistry';
import type { PlayerBase } from '@data/schemas/balance.schema';
import { Player } from '@domain/actors/Player';
import { Inventory } from '@domain/inventory/Inventory';
import { WorldFlags } from '@systems/flags/WorldFlags';
import { describe, expect, it } from 'vitest';


import { QuestSystem } from './QuestSystem';

const playerBase: PlayerBase = {
  id: 'balance.player_base',
  startingLevel: 1,
  startingStamina: 100,
  base: { hp: 50, mp: 20, str: 5, vit: 5, agi: 5, dex: 5, int: 5, luk: 5 },
};

const buildRegistry = (): ContentRegistry => {
  const r = new ContentRegistry();
  const monstersMap = {
    'mon.dummy': {
      id: 'mon.dummy',
      name: { en: 'Dummy' },
      family: 'test',
      tier: 1,
      levelRange: [1, 1],
      base: { hp: 5, mp: 0, str: 1, vit: 1, agi: 1, dex: 1, int: 1, luk: 1 },
      growth: { hp: 0, mp: 0, str: 0, vit: 0, agi: 0, dex: 0, int: 0, luk: 0 },
      resistances: {},
      skills: [],
      aiTreeId: 'ai.x',
      lootTableId: 'loot.x',
      size: 'M',
      expReward: 0,
      flags: [],
    },
  };
  const itemsMap = {
    'csm.minor_potion': {
      id: 'csm.minor_potion',
      name: { en: 'Potion' },
      slot: 'consumable',
      rarity: 'common',
      level: 1,
      tags: [],
      source: 'merchant',
      stackable: true,
      maxStack: 99,
      sellPrice: 0,
    },
  };
  const result = r.loadAll({
    items: itemsMap,
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
      'balance.damage_formula': {
        id: 'balance.damage_formula',
        defCoef: 0.5,
        minDamage: 1,
      },
    },
    skills: {},
    statusEffects: {},
    monsters: monstersMap,
    lootTables: {
      'loot.x': { id: 'loot.x', rolls: 1, entries: [{ kind: 'nothing', weight: 1 }] },
    },
    regions: {},
    maps: {},
    npcs: {},
    dialogues: {},
    quests: {
      'qst.test.kill_two': {
        id: 'qst.test.kill_two',
        name: { en: 'Kill Two' },
        type: 'side',
        hidden: false,
        prereqs: [{ flag: 'unlocked', equals: true }],
        autoStart: true,
        objectives: [
          {
            kind: 'kill',
            monsterId: 'mon.dummy',
            count: 2,
            description: { en: 'Kill 2 dummies' },
          },
        ],
        rewards: { exp: 0, gold: 5, items: [{ itemId: 'csm.minor_potion', qty: 1 }], flagsSet: ['done'] },
      },
    },
  });
  if (!result.ok) {
    throw new Error('test registry: ' + result.error.map((e) => e.message).join('\n'));
  }
  return r;
};

describe('QuestSystem', () => {
  it('locks quests until prereqs are satisfied; auto-starts when met', () => {
    const r = buildRegistry();
    const flags = new WorldFlags();
    const player = new Player(playerBase);
    const inv = new Inventory();
    const sys = new QuestSystem(r, flags, player, inv);
    expect(sys.activeQuests()).toHaveLength(0);
    flags.set('unlocked', true);
    sys.reevaluate();
    expect(sys.activeQuests()).toHaveLength(1);
  });

  it('advances counters and completes when objectives met; awards rewards', () => {
    const r = buildRegistry();
    const flags = new WorldFlags();
    const player = new Player(playerBase);
    const inv = new Inventory();
    const sys = new QuestSystem(r, flags, player, inv);
    flags.set('unlocked', true);
    sys.reevaluate();

    const u1 = sys.emit({ kind: 'monster.killed', id: 'mon.dummy', count: 1 });
    expect(u1.completed).toHaveLength(0);
    const u2 = sys.emit({ kind: 'monster.killed', id: 'mon.dummy', count: 1 });
    expect(u2.completed).toHaveLength(1);
    expect(inv.getGold()).toBe(5);
    expect(inv.count('csm.minor_potion')).toBe(1);
    expect(flags.get('done')).toBe(true);
  });

  it('ignores events for unrelated objectives', () => {
    const r = buildRegistry();
    const flags = new WorldFlags();
    const player = new Player(playerBase);
    const inv = new Inventory();
    const sys = new QuestSystem(r, flags, player, inv);
    flags.set('unlocked', true);
    sys.reevaluate();
    const u = sys.emit({ kind: 'monster.killed', id: 'mon.other', count: 5 });
    expect(u.updates).toHaveLength(0);
  });
});
