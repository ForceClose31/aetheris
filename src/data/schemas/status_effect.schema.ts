/**
 * Status Effect schema - data-driven debuffs/buffs applied during combat.
 *
 * Effects can deal periodic damage (Burn, Poison, Bleed), modify stats (Slow),
 * or block actions (Stun, Silence, Sleep, Root, Freeze).
 */

import { ELEMENTS, STAT_KEYS } from '@domain/actors/StatBlock';
import { z } from 'zod';

import { LOCALIZED_SCHEMA } from './item.schema';

export const STATUS_EFFECT_KIND = [
  'dot', // damage over time
  'stat', // modifies a stat while active
  'control', // restricts actions (stun/silence/etc)
] as const;
export type StatusEffectKind = (typeof STATUS_EFFECT_KIND)[number];

export const STATUS_EFFECT_TAG = [
  'burn',
  'freeze',
  'shock',
  'poison',
  'bleed',
  'curse',
  'silence',
  'stun',
  'slow',
  'root',
  'sleep',
  'haste',
  'shield',
  'regen',
] as const;
export type StatusEffectTag = (typeof STATUS_EFFECT_TAG)[number];

const STAT_KIND_SCHEMA = z
  .object({
    kind: z.literal('stat'),
    stat: z.enum(STAT_KEYS),
    modifier: z.enum(['flat', 'add', 'mult']),
    value: z.number(),
  })
  .strict();

const DOT_KIND_SCHEMA = z
  .object({
    kind: z.literal('dot'),
    element: z.enum(ELEMENTS),
    /** Damage per tick. Computed at apply-time as `base + coef * sourceStat`. */
    base: z.number().nonnegative(),
    coef: z.number().nonnegative().default(0),
    scaling: z.enum(STAT_KEYS).optional(),
    tickIntervalMs: z.number().int().positive(),
  })
  .strict();

const CONTROL_KIND_SCHEMA = z
  .object({
    kind: z.literal('control'),
    /** What the target cannot do while affected. */
    blocks: z.array(z.enum(['act', 'cast', 'move'])).min(1),
  })
  .strict();

export const STATUS_EFFECT_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^stx\.[a-z0-9_]+$/, { message: 'status effect id must be "stx.<lowercase>"' }),
    name: LOCALIZED_SCHEMA,
    tag: z.enum(STATUS_EFFECT_TAG),
    durationMs: z.number().int().positive(),
    /**
     * Stacking behaviour:
     *  - "refresh": new application resets the timer to full duration
     *  - "stack": stacks up to maxStacks, each stack ticks independently
     *  - "ignore": new application is ignored if active
     */
    stacking: z.enum(['refresh', 'stack', 'ignore']).default('refresh'),
    maxStacks: z.number().int().min(1).max(99).default(1),
    body: z.discriminatedUnion('kind', [STAT_KIND_SCHEMA, DOT_KIND_SCHEMA, CONTROL_KIND_SCHEMA]),
  })
  .strict();
export type StatusEffect = z.infer<typeof STATUS_EFFECT_SCHEMA>;
