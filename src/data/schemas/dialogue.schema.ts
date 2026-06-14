/**
 * Dialogue schema - tree of nodes that the dialogue runtime traverses.
 *
 * Each node either "say"s lines and advances, or asks the player to choose
 * between branches. Conditions and effects reference world flags by id.
 */

import { z } from 'zod';

import { LOCALIZED_SCHEMA } from './item.schema';

const FLAG_CONDITION = z
  .object({
    flag: z.string().min(1),
    /** Equals comparison: when value is `true|false|number|string`. */
    equals: z.union([z.boolean(), z.number(), z.string()]),
  })
  .strict();

const FLAG_EFFECT = z
  .object({
    flag: z.string().min(1),
    set: z.union([z.boolean(), z.number(), z.string()]),
  })
  .strict();

const SAY_NODE = z
  .object({
    kind: z.literal('say'),
    speaker: LOCALIZED_SCHEMA.optional(),
    lines: z.array(LOCALIZED_SCHEMA).min(1),
    next: z.string().min(1).optional(),
    requireFlags: z.array(FLAG_CONDITION).default([]),
    setFlags: z.array(FLAG_EFFECT).default([]),
  })
  .strict();

const CHOICE_OPTION = z
  .object({
    label: LOCALIZED_SCHEMA,
    next: z.string().min(1),
    requireFlags: z.array(FLAG_CONDITION).default([]),
  })
  .strict();

const CHOICE_NODE = z
  .object({
    kind: z.literal('choice'),
    speaker: LOCALIZED_SCHEMA.optional(),
    prompt: LOCALIZED_SCHEMA,
    options: z.array(CHOICE_OPTION).min(1).max(6),
    requireFlags: z.array(FLAG_CONDITION).default([]),
    setFlags: z.array(FLAG_EFFECT).default([]),
  })
  .strict();

const END_NODE = z
  .object({
    kind: z.literal('end'),
    setFlags: z.array(FLAG_EFFECT).default([]),
  })
  .strict();

export const DIALOGUE_NODE_SCHEMA = z.discriminatedUnion('kind', [
  SAY_NODE,
  CHOICE_NODE,
  END_NODE,
]);
export type DialogueNode = z.infer<typeof DIALOGUE_NODE_SCHEMA>;

export const DIALOGUE_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^dlg\.[a-z0-9_]+(\.[a-z0-9_]+)*$/, {
        message: 'dialogue id must be "dlg.<scope>.<name>" (lowercase)',
      }),
    /** Entry node id; must exist in `nodes`. */
    start: z.string().min(1),
    nodes: z.record(z.string().min(1), DIALOGUE_NODE_SCHEMA),
  })
  .strict()
  .refine((d) => Object.prototype.hasOwnProperty.call(d.nodes, d.start), {
    path: ['start'],
    message: 'start must reference a key in nodes',
  });
export type Dialogue = z.infer<typeof DIALOGUE_SCHEMA>;
