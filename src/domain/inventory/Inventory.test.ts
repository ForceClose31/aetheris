import type { Item } from '@data/schemas/item.schema';
import { describe, expect, it } from 'vitest';


import { Inventory } from './Inventory';

const stackable = (overrides: Partial<Item> = {}): Item => ({
  id: 'csm.minor_potion',
  name: { en: 'Minor Potion' },
  slot: 'consumable',
  rarity: 'common',
  level: 1,
  tags: [],
  source: 'merchant',
  stackable: true,
  maxStack: 99,
  sellPrice: 0,
  ...overrides,
});

const nonStackable = (overrides: Partial<Item> = {}): Item => ({
  id: 'wpn.rusty_sword',
  name: { en: 'Rusty Sword' },
  slot: 'main',
  rarity: 'common',
  level: 1,
  tags: [],
  source: 'drop',
  stackable: false,
  maxStack: 1,
  sellPrice: 0,
  ...overrides,
});

describe('Inventory', () => {
  it('manages gold add/spend', () => {
    const inv = new Inventory();
    expect(inv.getGold()).toBe(0);
    inv.addGold(50);
    expect(inv.getGold()).toBe(50);
    expect(inv.spendGold(60)).toBe(false);
    expect(inv.spendGold(20)).toBe(true);
    expect(inv.getGold()).toBe(30);
  });

  it('stacks stackable items up to maxStack', () => {
    const inv = new Inventory();
    const it = stackable({ maxStack: 5 });
    expect(inv.add(it, 3)).toBe(3);
    expect(inv.add(it, 10)).toBe(2); // capped to 5 total
    expect(inv.count(it.id)).toBe(5);
  });

  it('stores non-stackable items as separate entries', () => {
    const inv = new Inventory();
    const it = nonStackable();
    inv.add(it, 3);
    expect(inv.count(it.id)).toBe(3);
    expect(inv.totalItems()).toBe(3);
  });

  it('removes items partial and full', () => {
    const inv = new Inventory();
    const stk = stackable();
    inv.add(stk, 5);
    expect(inv.remove(stk.id, 2)).toBe(2);
    expect(inv.count(stk.id)).toBe(3);
    expect(inv.remove(stk.id, 99)).toBe(3);
    expect(inv.count(stk.id)).toBe(0);

    const ns = nonStackable();
    inv.add(ns, 2);
    expect(inv.remove(ns.id, 1)).toBe(1);
    expect(inv.count(ns.id)).toBe(1);
  });

  it('entries lists current stock', () => {
    const inv = new Inventory();
    inv.add(stackable(), 5);
    inv.add(nonStackable(), 1);
    const entries = inv.entries();
    expect(entries).toHaveLength(2);
  });
});
