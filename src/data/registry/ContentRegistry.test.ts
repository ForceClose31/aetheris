import { describe, expect, it } from 'vitest';

import { ContentRegistry } from './ContentRegistry';

const validItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'wpn.iron_sword',
  name: { en: 'Iron Sword' },
  slot: 'main',
  rarity: 'common',
  level: 1,
  tags: ['sword'],
  source: 'drop',
  stackable: false,
  maxStack: 1,
  sellPrice: 5,
  ...overrides,
});

const validBalance = (): Record<string, unknown> => ({
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
});

const validStatus = () => ({
  'stx.burn': {
    id: 'stx.burn',
    name: { en: 'Burn' },
    tag: 'burn',
    durationMs: 4000,
    stacking: 'refresh',
    maxStacks: 1,
    body: { kind: 'dot', element: 'fire', base: 2, coef: 0, tickIntervalMs: 1000 },
  },
});

const validSkill = () => ({
  'skl.basic_slash': {
    id: 'skl.basic_slash',
    name: { en: 'Basic Slash' },
    unlockLevel: 1,
    cost: { stamina: 5, cooldownMs: 250 },
    power: { coef: 1, base: 2, scaling: 'str' },
    element: 'phys',
    shape: { kind: 'single', range: 18 },
    effects: [],
    tags: ['melee'],
  },
});

const validLoot = () => ({
  'loot.basic': {
    id: 'loot.basic',
    rolls: 1,
    entries: [
      { kind: 'gold', weight: 1, range: [1, 3] },
      { kind: 'item', itemId: 'wpn.iron_sword', weight: 1, qty: [1, 1], luckThreshold: 0 },
    ],
  },
});

const validMonster = () => ({
  'mon.test_slime': {
    id: 'mon.test_slime',
    name: { en: 'Slime' },
    family: 'slime',
    tier: 1,
    levelRange: [1, 3],
    base: { hp: 10, mp: 0, str: 3, vit: 2, agi: 2, dex: 2, int: 1, luk: 1 },
    growth: { hp: 4, mp: 0, str: 1, vit: 1, agi: 0, dex: 0, int: 0, luk: 0 },
    resistances: {},
    skills: ['skl.basic_slash'],
    aiTreeId: 'ai.x',
    lootTableId: 'loot.basic',
    size: 'S',
    expReward: 5,
    flags: [],
  },
});

const validMaps = () => ({
  'map.test.town': {
    id: 'map.test.town',
    name: { en: 'Town' },
    type: 'town',
    tileSize: 16,
    tiles: [
      [1, 1, 1],
      [1, 5, 1],
      [1, 1, 1],
    ],
    defaultSpawn: 'spawn.center',
    spawns: [{ id: 'spawn.center', pos: [1, 1] }],
    exits: [],
    npcs: [{ npcId: 'npc.test', spawn: [1, 1] }],
    monsters: [{ monsterId: 'mon.test_slime', weight: 1, maxConcurrent: 1 }],
    indoor: false,
  },
});

const validNpcs = () => ({
  'npc.test': {
    id: 'npc.test',
    name: { en: 'Test' },
    dialogueId: 'dlg.test',
    schedule: [{ fromHour: 0, toHour: 23, mapId: 'map.test.town', pos: [1, 1] }],
    placeholderColor: 'aabbcc',
  },
});

const validDialogues = () => ({
  'dlg.test': {
    id: 'dlg.test',
    start: 'a',
    nodes: { a: { kind: 'end', setFlags: [] } },
  },
});

const validRegions = () => ({
  'reg.test': {
    id: 'reg.test',
    name: { en: 'Test Region' },
    levelRange: [1, 5],
    mapIds: ['map.test.town'],
    hubMapId: 'map.test.town',
  },
});

const validQuests = () => ({
  'qst.test.intro': {
    id: 'qst.test.intro',
    name: { en: 'Intro' },
    type: 'main',
    hidden: false,
    prereqs: [],
    autoStart: true,
    objectives: [
      {
        kind: 'kill',
        monsterId: 'mon.test_slime',
        count: 1,
        description: { en: 'kill 1' },
      },
    ],
    rewards: { exp: 0, gold: 0, items: [], flagsSet: [] },
  },
});

const fullSource = () => ({
  items: { 'wpn.iron_sword': validItem() },
  balance: validBalance(),
  skills: validSkill(),
  statusEffects: validStatus(),
  monsters: validMonster(),
  lootTables: validLoot(),
  regions: validRegions(),
  maps: validMaps(),
  npcs: validNpcs(),
  dialogues: validDialogues(),
  quests: validQuests(),
});

describe('ContentRegistry', () => {
  it('loads all kinds and runs cross-reference checks', () => {
    const r = new ContentRegistry();
    const result = r.loadAll(fullSource());
    expect(result.ok).toBe(true);
    expect(r.itemCount()).toBe(1);
    expect(r.requireMap('map.test.town').name.en).toBe('Town');
    expect(r.requireNpc('npc.test').dialogueId).toBe('dlg.test');
    expect(r.requireDialogue('dlg.test').start).toBe('a');
    expect(r.requireRegion('reg.test').hubMapId).toBe('map.test.town');
    expect(r.requireQuest('qst.test.intro').type).toBe('main');
  });

  it('reports validation errors for invalid items', () => {
    const r = new ContentRegistry();
    const src = fullSource();
    const result = r.loadAll({
      ...src,
      items: { 'bad.item': { id: 'bad.item', name: { en: 'X' }, level: -1 } as unknown },
    });
    expect(result.ok).toBe(false);
  });

  it('detects key/id mismatch on items', () => {
    const r = new ContentRegistry();
    const src = fullSource();
    const result = r.loadAll({
      ...src,
      items: { 'wpn.wrong_key': validItem() },
    });
    expect(result.ok).toBe(false);
  });

  it('reports missing balance files', () => {
    const r = new ContentRegistry();
    const src = fullSource();
    const result = r.loadAll({ ...src, balance: {} });
    expect(result.ok).toBe(false);
  });

  it('detects monster referencing unknown skill', () => {
    const r = new ContentRegistry();
    const src = fullSource();
    const monsterMap = validMonster();
    const m = monsterMap['mon.test_slime'] as { skills: string[] };
    m.skills = ['skl.does_not_exist'];
    const result = r.loadAll({ ...src, monsters: monsterMap });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.message.includes('skl.does_not_exist'))).toBe(true);
    }
  });

  it('detects loot table referencing unknown item', () => {
    const r = new ContentRegistry();
    const src = fullSource();
    const lootMap = validLoot();
    const lt = lootMap['loot.basic'] as { entries: { kind: string; itemId?: string }[] };
    lt.entries[1] = {
      kind: 'item',
      itemId: 'wpn.does_not_exist',
      // @ts-expect-error - extra fields allowed by raw shape
      weight: 1,
      qty: [1, 1],
      luckThreshold: 0,
    };
    const result = r.loadAll({ ...src, lootTables: lootMap });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.message.includes('wpn.does_not_exist'))).toBe(true);
    }
  });

  it('detects map referencing unknown exit map', () => {
    const r = new ContentRegistry();
    const src = fullSource();
    const maps = validMaps();
    const m = maps['map.test.town'] as { exits: unknown[] };
    m.exits = [
      {
        id: 'broken',
        rect: [1, 1, 1, 1],
        to: { mapId: 'map.does_not_exist', marker: 'spawn.center' },
        requireFlags: [],
      },
    ];
    const result = r.loadAll({ ...src, maps });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.message.includes('map.does_not_exist'))).toBe(true);
    }
  });

  it('detects npc referencing unknown dialogue', () => {
    const r = new ContentRegistry();
    const src = fullSource();
    const npcs = validNpcs();
    const n = npcs['npc.test'] as { dialogueId: string };
    n.dialogueId = 'dlg.zz';
    const result = r.loadAll({ ...src, npcs });
    expect(result.ok).toBe(false);
  });

  it('throws when balance is requested before successful load', () => {
    const r = new ContentRegistry();
    expect(() => r.getBalance()).toThrow();
  });
});
