/**
 * Monster schema - per GDD section 11.
 *
 * Stats scale by level using `base` + `growth * (level - 1)`. Skills reference
 * skill ids; lootTableId references a loot table; aiTreeId is informational
 * for Phase 2 (basic state-machine AI is hardcoded).
 */

import { ELEMENTS, STAT_BLOCK_SCHEMA } from '@domain/actors/StatBlock';
import { z } from 'zod';

import { LOCALIZED_SCHEMA } from './item.schema';

const STAT_GROWTH_SCHEMA = STAT_BLOCK_SCHEMA;

export const MONSTER_SIZES = ['S', 'M', 'L', 'XL'] as const;

export const MONSTER_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^mon\.[a-z0-9_]+$/, { message: 'monster id must be "mon.<lowercase>"' }),
    name: LOCALIZED_SCHEMA,
    family: z.string().min(1),
    tier: z.number().int().min(1).max(5),
    levelRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
    base: STAT_BLOCK_SCHEMA,
    growth: STAT_GROWTH_SCHEMA,
    /** Element resistances/weaknesses. Positive = resistant; negative = weak. Range -1..1. */
    resistances: z.record(z.enum(ELEMENTS), z.number().min(-1).max(1)).default({}),
    skills: z.array(z.string().min(1)).default([]),
    aiTreeId: z.string().min(1),
    lootTableId: z.string().min(1),
    spawnRuleId: z.string().min(1).optional(),
    size: z.enum(MONSTER_SIZES).default('M'),
    /** EXP awarded on kill at the monster's spawn level. */
    expReward: z.number().int().nonnegative().default(0),
    flags: z.array(z.string().min(1)).default([]),
    description: z.string().optional(),
  })
  .strict()
  .refine((m) => m.levelRange[0] <= m.levelRange[1], {
    path: ['levelRange'],
    message: 'levelRange must be [min, max] with min <= max',
  });
export type Monster = z.infer<typeof MONSTER_SCHEMA>;
