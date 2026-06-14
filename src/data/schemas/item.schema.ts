import { z } from 'zod';

/** Localized name. v1 ships English; CJK + ID added later. */
export const LOCALIZED_SCHEMA = z.object({
  en: z.string().min(1),
  id: z.string().optional(),
  ja: z.string().optional(),
  zh: z.string().optional(),
});
export type Localized = z.infer<typeof LOCALIZED_SCHEMA>;

export const RARITY = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'divine',
] as const;
export type Rarity = (typeof RARITY)[number];

export const SLOTS = [
  'main',
  'off',
  'helm',
  'chest',
  'legs',
  'boots',
  'gloves',
  'cape',
  'ring',
  'amulet',
  'relic',
  'artifact',
  'consumable',
  'material',
] as const;
export type Slot = (typeof SLOTS)[number];

export const ITEM_SOURCE = ['drop', 'craft', 'quest', 'merchant', 'hidden'] as const;
export type ItemSource = (typeof ITEM_SOURCE)[number];

/**
 * Item schema (Phase 0: minimum viable).
 * Subsequent phases add affixes, set bonuses, sockets.
 */
export const ITEM_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/, {
        message: 'id must be namespaced lowercase, e.g. "wpn.iron_sword"',
      }),
    name: LOCALIZED_SCHEMA,
    slot: z.enum(SLOTS),
    rarity: z.enum(RARITY),
    level: z.number().int().min(1).max(300),
    reqs: z
      .object({
        level: z.number().int().min(1).optional(),
        jobs: z.array(z.string().min(1)).optional(),
      })
      .optional(),
    stats: z
      .object({
        hp: z.number().int().optional(),
        mp: z.number().int().optional(),
        str: z.number().int().optional(),
        vit: z.number().int().optional(),
        agi: z.number().int().optional(),
        dex: z.number().int().optional(),
        int: z.number().int().optional(),
        luk: z.number().int().optional(),
      })
      .optional(),
    tags: z.array(z.string().min(1)).default([]),
    icon: z.string().min(1).optional(),
    description: z.string().optional(),
    source: z.enum(ITEM_SOURCE),
    stackable: z.boolean().default(false),
    maxStack: z.number().int().min(1).max(9999).default(1),
    sellPrice: z.number().int().min(0).default(0),
  })
  .strict();

export type Item = z.infer<typeof ITEM_SCHEMA>;
