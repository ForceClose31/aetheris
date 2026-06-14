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

describe('ContentRegistry', () => {
  it('loads valid items + balance bundle', () => {
    const r = new ContentRegistry();
    const result = r.loadAll({
      items: { 'wpn.iron_sword': validItem() },
      balance: validBalance(),
    });
    expect(result.ok).toBe(true);
    expect(r.itemCount()).toBe(1);
    expect(r.requireItem('wpn.iron_sword').name.en).toBe('Iron Sword');
    expect(r.getBalance().expCurve.maxLevel).toBe(200);
  });

  it('reports validation errors for invalid items', () => {
    const r = new ContentRegistry();
    const result = r.loadAll({
      items: {
        'bad.item': { id: 'bad.item', name: { en: 'X' }, level: -1 } as unknown,
      },
      balance: validBalance(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('detects key/id mismatch on items', () => {
    const r = new ContentRegistry();
    const result = r.loadAll({
      items: { 'wpn.wrong_key': validItem() },
      balance: validBalance(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((e) => e.message.includes('id_mismatch'))).toBe(true);
    }
  });

  it('reports missing balance files', () => {
    const r = new ContentRegistry();
    const result = r.loadAll({ items: {}, balance: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('throws when querying unknown items via requireItem', () => {
    const r = new ContentRegistry();
    r.loadAll({ items: {}, balance: validBalance() });
    expect(() => r.requireItem('nope')).toThrow();
  });

  it('throws when balance is requested before successful load', () => {
    const r = new ContentRegistry();
    expect(() => r.getBalance()).toThrow();
  });
});
