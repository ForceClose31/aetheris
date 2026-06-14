/**
 * Skill schema - active skill definitions used by player and monsters.
 *
 * Phase 2 covers single-target and AoE shapes. Projectile/line/cone skills
 * exist in the type union but are reserved for richer combat phases.
 */

import { ELEMENTS, STAT_KEYS } from '@domain/actors/StatBlock';
import { z } from 'zod';

import { LOCALIZED_SCHEMA } from './item.schema';

const COST_SCHEMA = z
  .object({
    mp: z.number().nonnegative().default(0),
    hp: z.number().nonnegative().default(0),
    stamina: z.number().nonnegative().default(0),
    cooldownMs: z.number().int().nonnegative().default(0),
  })
  .strict();

const POWER_SCHEMA = z
  .object({
    coef: z.number().nonnegative(),
    base: z.number().nonnegative().default(0),
    scaling: z.enum(STAT_KEYS),
  })
  .strict();

const SHAPE_SINGLE = z
  .object({ kind: z.literal('single'), range: z.number().positive() })
  .strict();
const SHAPE_AOE = z
  .object({
    kind: z.literal('aoe'),
    /** Centered on caster. */
    radius: z.number().positive(),
  })
  .strict();
const SHAPE_PROJECTILE = z
  .object({
    kind: z.literal('projectile'),
    range: z.number().positive(),
    speed: z.number().positive(),
  })
  .strict();
const SHAPE_LINE = z
  .object({ kind: z.literal('line'), length: z.number().positive(), width: z.number().positive() })
  .strict();
const SHAPE_CONE = z
  .object({
    kind: z.literal('cone'),
    range: z.number().positive(),
    angleDeg: z.number().min(1).max(360),
  })
  .strict();

export const SKILL_SHAPE_SCHEMA = z.discriminatedUnion('kind', [
  SHAPE_SINGLE,
  SHAPE_AOE,
  SHAPE_PROJECTILE,
  SHAPE_LINE,
  SHAPE_CONE,
]);
export type SkillShape = z.infer<typeof SKILL_SHAPE_SCHEMA>;

export const SKILL_EFFECT_SCHEMA = z
  .object({
    /** Reference to a status effect id (stx.*). */
    statusId: z.string().regex(/^stx\.[a-z0-9_]+$/),
    /** Probability 0..1 to apply on hit. */
    chance: z.number().min(0).max(1).default(1),
  })
  .strict();
export type SkillEffectRef = z.infer<typeof SKILL_EFFECT_SCHEMA>;

export const SKILL_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^skl\.[a-z0-9_]+$/, { message: 'skill id must be "skl.<lowercase>"' }),
    name: LOCALIZED_SCHEMA,
    /** Optional - empty for monster skills or universal skills. */
    jobId: z.string().min(1).optional(),
    unlockLevel: z.number().int().min(1).max(300).default(1),
    cost: COST_SCHEMA.default({}),
    power: POWER_SCHEMA,
    element: z.enum(ELEMENTS),
    shape: SKILL_SHAPE_SCHEMA,
    effects: z.array(SKILL_EFFECT_SCHEMA).default([]),
    /** Free-form tags consumed by AI/UX (e.g. "ranged", "buff"). */
    tags: z.array(z.string().min(1)).default([]),
    description: z.string().optional(),
  })
  .strict();
export type Skill = z.infer<typeof SKILL_SCHEMA>;
