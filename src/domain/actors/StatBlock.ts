/**
 * StatBlock - the canonical stat container shared by Player, Monster, Boss.
 */

import { z } from 'zod';

export const ELEMENTS = [
  'phys',
  'fire',
  'ice',
  'lightning',
  'earth',
  'holy',
  'dark',
  'void',
] as const;
export type Element = (typeof ELEMENTS)[number];

export const STAT_KEYS = ['hp', 'mp', 'str', 'vit', 'agi', 'dex', 'int', 'luk'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type StatBlock = Readonly<Record<StatKey, number>>;

export const STAT_BLOCK_SCHEMA = z.object({
  hp: z.number().int().nonnegative(),
  mp: z.number().int().nonnegative(),
  str: z.number().int().nonnegative(),
  vit: z.number().int().nonnegative(),
  agi: z.number().int().nonnegative(),
  dex: z.number().int().nonnegative(),
  int: z.number().int().nonnegative(),
  luk: z.number().int().nonnegative(),
});

export const PARTIAL_STAT_BLOCK_SCHEMA = STAT_BLOCK_SCHEMA.partial();
