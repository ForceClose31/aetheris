/**
 * NPC schema - villagers, merchants, quest givers.
 *
 * Schedules are a list of (hourRange, mapId, tile) entries. The schedule resolver
 * picks the entry whose hour range covers the current world hour.
 */

import { z } from 'zod';

import { LOCALIZED_SCHEMA } from './item.schema';

const SHOP_SCHEMA = z
  .object({
    /** Static stock list. Stock rotation lands in a later phase. */
    sells: z
      .array(
        z
          .object({
            itemId: z.string().min(1),
            /** Price in gold. If omitted, falls back to item.sellPrice * markup. */
            price: z.number().int().min(0).optional(),
            /** Daily restock count; -1 = infinite. */
            stock: z.number().int().min(-1).default(-1),
          })
          .strict(),
      )
      .default([]),
    /** Multiplier applied to item.sellPrice when buying back from the player. */
    buybackMultiplier: z.number().min(0).max(1).default(0.5),
  })
  .strict();

const SCHEDULE_ENTRY_SCHEMA = z
  .object({
    /** Inclusive start/end hours (0-23). Wrapping is allowed: from > to means cross-midnight. */
    fromHour: z.number().int().min(0).max(23),
    toHour: z.number().int().min(0).max(23),
    mapId: z.string().min(1),
    /** Tile coordinates (col, row). */
    pos: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
    /** Optional dialogue override during this slot. */
    dialogueId: z.string().min(1).optional(),
  })
  .strict();

export const NPC_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^npc\.[a-z0-9_]+$/, { message: 'npc id must be "npc.<lowercase>"' }),
    name: LOCALIZED_SCHEMA,
    /** Default dialogue id when no schedule slot specifies one. */
    dialogueId: z.string().min(1),
    shop: SHOP_SCHEMA.optional(),
    schedule: z.array(SCHEDULE_ENTRY_SCHEMA).default([]),
    /** Color hint for placeholder rendering (hex string without `#`). */
    placeholderColor: z
      .string()
      .regex(/^[0-9a-fA-F]{6}$/)
      .default('a0a0c0'),
    description: z.string().optional(),
  })
  .strict();
export type Npc = z.infer<typeof NPC_SCHEMA>;
export type NpcSchedule = Npc['schedule'];
export type NpcShop = NonNullable<Npc['shop']>;
