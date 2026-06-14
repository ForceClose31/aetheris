import { ContentRegistry } from '@data/registry/ContentRegistry';
import { describe, expect, it } from 'vitest';


import { WorldState } from './WorldState';

const buildRegistry = (): ContentRegistry => {
  const r = new ContentRegistry();
  const result = r.loadAll({
    items: {},
    balance: {
      'balance.player_base': {
        id: 'balance.player_base',
        startingLevel: 1,
        startingStamina: 100,
        base: { hp: 50, mp: 20, str: 5, vit: 5, agi: 5, dex: 5, int: 5, luk: 5 },
      },
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
    monsters: {},
    lootTables: {},
    regions: {},
    maps: {
      'map.a': {
        id: 'map.a',
        name: { en: 'A' },
        type: 'town',
        tileSize: 16,
        tiles: [[1, 1], [1, 0]],
        defaultSpawn: 'spawn.start',
        spawns: [
          { id: 'spawn.start', pos: [1, 1] },
          { id: 'spawn.from_b', pos: [1, 1] },
        ],
        exits: [],
        npcs: [],
        monsters: [],
        indoor: false,
      },
      'map.b': {
        id: 'map.b',
        name: { en: 'B' },
        type: 'field',
        tileSize: 16,
        tiles: [[1, 1], [1, 0]],
        defaultSpawn: 'spawn.entry',
        spawns: [{ id: 'spawn.entry', pos: [1, 1] }],
        exits: [],
        npcs: [],
        monsters: [],
        indoor: false,
      },
    },
    npcs: {},
    dialogues: {},
    quests: {},
  });
  if (!result.ok) {
    throw new Error('failed: ' + result.error.map((e) => e.message).join('\n'));
  }
  return r;
};

describe('WorldState', () => {
  it('initializes from a starting map and its default spawn', () => {
    const r = buildRegistry();
    const ws = new WorldState(r, 'map.a');
    expect(ws.getCurrentMapId()).toBe('map.a');
    expect(ws.getCurrentSpawnMarker()).toBe('spawn.start');
  });

  it('transitions to a known map + marker', () => {
    const r = buildRegistry();
    const ws = new WorldState(r, 'map.a');
    expect(ws.transitionTo('map.b', 'spawn.entry')).toBe(true);
    expect(ws.getCurrentMapId()).toBe('map.b');
  });

  it('rejects unknown map or marker', () => {
    const r = buildRegistry();
    const ws = new WorldState(r, 'map.a');
    expect(ws.transitionTo('map.zz', 'spawn.entry')).toBe(false);
    expect(ws.transitionTo('map.b', 'spawn.zz')).toBe(false);
  });
});
