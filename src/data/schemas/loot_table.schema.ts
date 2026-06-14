/**
 * Loot Table schema - weighted random roll with optional gold range and rolls count.
 *
 * Each entry is a chance/weight to drop one of: a specific item id, gold, or "nothing"
 * (the noDrop slot). LUK influences rare drops by adding to the roll's bias index.
 */

import { z } from 'zod';

const LOOT_ENTRY_SCHEMA = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('item'),
      itemId: z.string().min(1),
      weight: z.number().positive(),
      /** Quantity range, inclusive. */
      qty: z.tuple([z.number().int().min(1), z.number().int().min(1)]).default([1, 1]),
      /** Higher = needs more LUK to surface; default 0 (no bias). */
      luckThreshold: z.number().int().min(0).default(0),
    })
    .strict(),
  z
    .object({
      kind: z.literal('gold'),
      weight: z.number().positive(),
      range: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
    })
    .strict(),
  z
    .object({
      kind: z.literal('nothing'),
      weight: z.number().positive(),
    })
    .strict(),
]);
export type LootEntry = z.infer<typeof LOOT_ENTRY_SCHEMA>;

export const LOOT_TABLE_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^loot\.[a-z0-9_]+$/, { message: 'loot table id must be "loot.<lowercase>"' }),
    /** Number of independent rolls performed when this table is invoked. */
    rolls: z.number().int().min(1).max(10).default(1),
    entries: z.array(LOOT_ENTRY_SCHEMA).min(1),
  })
  .strict();
export type LootTable = z.infer<typeof LOOT_TABLE_SCHEMA>;
