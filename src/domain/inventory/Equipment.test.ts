import { Player } from '@domain/actors/Player';
import { describe, expect, it } from 'vitest';

import type { PlayerBase } from '@data/schemas/balance.schema';
import type { Item } from '@data/schemas/item.schema';

import { Equipment } from './Equipment';

const playerBase: PlayerBase = {
  id: 'balance.player_base',
  startingLevel: 1,
  startingStamina: 100,
  base: { hp: 50, mp: 20, str: 5, vit: 5, agi: 5, dex: 5, int: 5, luk: 5 },
};

const sword = (str: number): Item => ({
  id: `wpn.test_sword_${str}`,
  name: { en: `Sword ${str}` },
  slot: 'main',
  rarity: 'common',
  level: 1,
  stats: { str },
  tags: [],
  source: 'drop',
  stackable: false,
  maxStack: 1,
  sellPrice: 0,
});

describe('Equipment', () => {
  it('applies stat modifiers from equipped items', () => {
    const p = new Player(playerBase);
    const eq = new Equipment(p);
    const before = p.computeDerived().str;
    eq.equip('main', sword(7));
    const after = p.computeDerived().str;
    expect(after).toBe(before + 7);
  });

  it('replacing an item removes the previous modifiers', () => {
    const p = new Player(playerBase);
    const eq = new Equipment(p);
    eq.equip('main', sword(3));
    const previous = eq.equip('main', sword(8));
    expect(previous?.id).toBe('wpn.test_sword_3');
    expect(p.computeDerived().str).toBe(playerBase.base.str + 8);
  });

  it('unequip drops the modifier and returns the item', () => {
    const p = new Player(playerBase);
    const eq = new Equipment(p);
    eq.equip('main', sword(5));
    const removed = eq.unequip('main');
    expect(removed?.id).toBe('wpn.test_sword_5');
    expect(p.computeDerived().str).toBe(playerBase.base.str);
  });

  it('rejects mismatched slot', () => {
    const p = new Player(playerBase);
    const eq = new Equipment(p);
    expect(() => eq.equip('helm', sword(2))).toThrow();
  });
});
