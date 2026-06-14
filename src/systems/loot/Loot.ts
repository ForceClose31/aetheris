/**
 * Loot rolling - applies a LootTable's weighted roll using a seeded Rng.
 *
 * LUK influences `luckThreshold` checks: a roll's effective LUK must be >=
 * `luckThreshold` for the item entry to surface; otherwise that entry is skipped.
 * `luckBoost` re-rolls a single failed pick once per roll if any unsurfaced
 * threshold was within reach.
 */

import type { Rng } from '@core/Rng';

import type { LootEntry, LootTable } from '@data/schemas/loot_table.schema';

export interface LootResultEntry {
  readonly kind: 'item' | 'gold';
  /** When kind is 'item'. */
  readonly itemId?: string;
  /** Quantity for items, amount for gold. */
  readonly qty: number;
}

export interface LootRollContext {
  readonly luk: number;
  readonly rng: Rng;
}

const passesLuck = (entry: LootEntry, luk: number): boolean => {
  if (entry.kind !== 'item') {
    return true;
  }
  return luk >= entry.luckThreshold;
};

const pickWeighted = (
  entries: readonly LootEntry[],
  rng: Rng,
  luk: number,
): LootEntry | null => {
  const eligible = entries.filter((e) => passesLuck(e, luk));
  if (eligible.length === 0) {
    return null;
  }
  let total = 0;
  for (const e of eligible) {
    total += e.weight;
  }
  let roll = rng.next() * total;
  for (const e of eligible) {
    roll -= e.weight;
    if (roll <= 0) {
      return e;
    }
  }
  return eligible[eligible.length - 1] ?? null;
};

export const rollLoot = (
  table: LootTable,
  ctx: LootRollContext,
): LootResultEntry[] => {
  const out: LootResultEntry[] = [];
  for (let i = 0; i < table.rolls; i++) {
    const pick = pickWeighted(table.entries, ctx.rng, ctx.luk);
    if (pick === null || pick.kind === 'nothing') {
      continue;
    }
    if (pick.kind === 'gold') {
      const [lo, hi] = pick.range;
      const amount = ctx.rng.int(lo, hi);
      if (amount > 0) {
        out.push({ kind: 'gold', qty: amount });
      }
    } else {
      const [lo, hi] = pick.qty;
      const qty = ctx.rng.int(lo, hi);
      if (qty > 0) {
        out.push({ kind: 'item', itemId: pick.itemId, qty });
      }
    }
  }
  return out;
};
