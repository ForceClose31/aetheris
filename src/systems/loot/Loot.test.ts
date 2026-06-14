import { Rng } from '@core/Rng';
import type { LootTable } from '@data/schemas/loot_table.schema';
import { describe, expect, it } from 'vitest';


import { rollLoot } from './Loot';

const table: LootTable = {
  id: 'loot.test',
  rolls: 1,
  entries: [
    { kind: 'gold', weight: 1, range: [5, 5] },
    { kind: 'item', itemId: 'wpn.x', weight: 1, qty: [1, 1], luckThreshold: 0 },
    { kind: 'item', itemId: 'wpn.rare', weight: 1, qty: [1, 1], luckThreshold: 100 },
    { kind: 'nothing', weight: 1 },
  ],
};

describe('rollLoot', () => {
  it('respects luckThreshold (rare entry filtered out at low LUK)', () => {
    let sawRare = false;
    for (let i = 0; i < 200; i++) {
      const out = rollLoot(table, { luk: 1, rng: new Rng(i) });
      if (out.some((d) => d.kind === 'item' && d.itemId === 'wpn.rare')) {
        sawRare = true;
        break;
      }
    }
    expect(sawRare).toBe(false);
  });

  it('surfaces the rare entry at high LUK', () => {
    let sawRare = false;
    for (let i = 0; i < 200; i++) {
      const out = rollLoot(table, { luk: 200, rng: new Rng(i) });
      if (out.some((d) => d.kind === 'item' && d.itemId === 'wpn.rare')) {
        sawRare = true;
        break;
      }
    }
    expect(sawRare).toBe(true);
  });

  it('rolls multiple times when rolls > 1', () => {
    const t: LootTable = {
      ...table,
      rolls: 5,
      entries: [{ kind: 'gold', weight: 1, range: [1, 1] }],
    };
    const out = rollLoot(t, { luk: 0, rng: new Rng(123) });
    expect(out).toHaveLength(5);
    expect(out.every((d) => d.kind === 'gold' && d.qty === 1)).toBe(true);
  });

  it('returns deterministic results for the same seed', () => {
    const a = rollLoot(table, { luk: 50, rng: new Rng(99) });
    const b = rollLoot(table, { luk: 50, rng: new Rng(99) });
    expect(a).toEqual(b);
  });
});
