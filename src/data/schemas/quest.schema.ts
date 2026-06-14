/**
 * Quest schema - state-machine quests with objectives, conditions, and rewards.
 *
 * Each objective tracks progress against a typed counter. The QuestSystem listens
 * for relevant events (monster.killed, item.acquired, flag.set, area.entered) and
 * advances objective counters until all are met, then awards rewards.
 */

import { z } from 'zod';

import { LOCALIZED_SCHEMA } from './item.schema';

const FLAG_CONDITION = z
  .object({
    flag: z.string().min(1),
    equals: z.union([z.boolean(), z.number(), z.string()]),
  })
  .strict();

const KILL_OBJECTIVE = z
  .object({
    kind: z.literal('kill'),
    monsterId: z.string().min(1),
    count: z.number().int().min(1),
    description: LOCALIZED_SCHEMA,
  })
  .strict();

const COLLECT_OBJECTIVE = z
  .object({
    kind: z.literal('collect'),
    itemId: z.string().min(1),
    count: z.number().int().min(1),
    description: LOCALIZED_SCHEMA,
  })
  .strict();

const FLAG_OBJECTIVE = z
  .object({
    kind: z.literal('flag'),
    condition: FLAG_CONDITION,
    description: LOCALIZED_SCHEMA,
  })
  .strict();

const REACH_OBJECTIVE = z
  .object({
    kind: z.literal('reach'),
    mapId: z.string().min(1),
    description: LOCALIZED_SCHEMA,
  })
  .strict();

const TALK_OBJECTIVE = z
  .object({
    kind: z.literal('talk'),
    npcId: z.string().min(1),
    description: LOCALIZED_SCHEMA,
  })
  .strict();

export const QUEST_OBJECTIVE_SCHEMA = z.discriminatedUnion('kind', [
  KILL_OBJECTIVE,
  COLLECT_OBJECTIVE,
  FLAG_OBJECTIVE,
  REACH_OBJECTIVE,
  TALK_OBJECTIVE,
]);
export type QuestObjective = z.infer<typeof QUEST_OBJECTIVE_SCHEMA>;

const REWARD_SCHEMA = z
  .object({
    exp: z.number().int().min(0).default(0),
    gold: z.number().int().min(0).default(0),
    items: z
      .array(
        z
          .object({
            itemId: z.string().min(1),
            qty: z.number().int().min(1),
          })
          .strict(),
      )
      .default([]),
    flagsSet: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const QUEST_TYPES = ['main', 'side', 'hidden', 'guild', 'world_event'] as const;

export const QUEST_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^qst\.[a-z0-9_]+(\.[a-z0-9_]+)*$/, {
        message: 'quest id must be "qst.<scope>.<name>" (lowercase)',
      }),
    name: LOCALIZED_SCHEMA,
    type: z.enum(QUEST_TYPES),
    hidden: z.boolean().default(false),
    /** Quests require all listed flags before they can start. */
    prereqs: z.array(FLAG_CONDITION).default([]),
    /** Quests are auto-started when all prereqs are met. */
    autoStart: z.boolean().default(false),
    objectives: z.array(QUEST_OBJECTIVE_SCHEMA).min(1),
    rewards: REWARD_SCHEMA.default({}),
    description: LOCALIZED_SCHEMA.optional(),
  })
  .strict();
export type Quest = z.infer<typeof QUEST_SCHEMA>;
