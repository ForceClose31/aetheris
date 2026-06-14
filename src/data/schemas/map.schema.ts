/**
 * Map schema - a single playable scene's data.
 *
 * Phase 3 ships a synthetic grid format (`tiles` is a 2D array of tile codes).
 * The Tiled importer (Phase 5+) will produce this same shape from .tmx files.
 *
 * Tile codes:
 *   0 = floor (walkable)
 *   1 = wall  (blocks movement)
 *   2 = door  (walkable, decorative)
 *   3 = water (decorative; blocks for now)
 *   4 = path  (walkable)
 *   5 = grass (walkable)
 */

import { z } from 'zod';

import { LOCALIZED_SCHEMA } from './item.schema';

export const MAP_TYPES = ['town', 'field', 'dungeon', 'hidden', 'boss_arena'] as const;
export type MapType = (typeof MAP_TYPES)[number];

export const TILE_CODE = z.number().int().min(0).max(15);

const NPC_PLACEMENT_SCHEMA = z
  .object({
    npcId: z.string().min(1),
    /** Starting tile coordinates (column, row). */
    spawn: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  })
  .strict();

const SPAWN_POINT_SCHEMA = z
  .object({
    id: z.string().min(1),
    pos: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  })
  .strict();

const EXIT_SCHEMA = z
  .object({
    id: z.string().min(1),
    /** Tile rectangle that triggers the exit (x, y, width, height) in tile units. */
    rect: z.tuple([
      z.number().int().min(0),
      z.number().int().min(0),
      z.number().int().min(1),
      z.number().int().min(1),
    ]),
    to: z
      .object({
        mapId: z.string().min(1),
        marker: z.string().min(1),
      })
      .strict(),
    /** Optional world-flag conditions; all must be true to allow transit. */
    requireFlags: z.array(z.string().min(1)).default([]),
  })
  .strict();

const MONSTER_SPAWN_SCHEMA = z
  .object({
    monsterId: z.string().min(1),
    weight: z.number().positive(),
    /** Maximum simultaneous instances of this monster on the map. */
    maxConcurrent: z.number().int().min(1).max(20).default(2),
    /** Tile-area rectangle where the monster may spawn; empty = anywhere walkable. */
    rect: z
      .tuple([
        z.number().int().min(0),
        z.number().int().min(0),
        z.number().int().min(1),
        z.number().int().min(1),
      ])
      .optional(),
  })
  .strict();

export const MAP_SCHEMA = z
  .object({
    id: z
      .string()
      .min(3)
      .regex(/^map\.[a-z0-9_]+(\.[a-z0-9_]+)*$/, {
        message: 'map id must be "map.<region>.<name>" (lowercase)',
      }),
    name: LOCALIZED_SCHEMA,
    type: z.enum(MAP_TYPES),
    tileSize: z.number().int().min(8).max(64).default(16),
    /** 2D array of tile codes [row][col]. All rows must share the same length. */
    tiles: z.array(z.array(TILE_CODE).min(1)).min(1),
    /** Default tile player lands on if the prior scene did not specify a marker. */
    defaultSpawn: z.string().min(1),
    spawns: z.array(SPAWN_POINT_SCHEMA).min(1),
    exits: z.array(EXIT_SCHEMA).default([]),
    npcs: z.array(NPC_PLACEMENT_SCHEMA).default([]),
    monsters: z.array(MONSTER_SPAWN_SCHEMA).default([]),
    music: z.string().optional(),
    ambient: z.string().optional(),
    /** Tint applied to the day/night overlay base (hex string), optional. */
    indoor: z.boolean().default(false),
  })
  .strict()
  .refine(
    (m) => m.tiles.every((row) => row.length === (m.tiles[0]?.length ?? 0)),
    { path: ['tiles'], message: 'all tile rows must have equal length' },
  )
  .refine((m) => m.spawns.some((s) => s.id === m.defaultSpawn), {
    path: ['defaultSpawn'],
    message: 'defaultSpawn must reference one of spawns[].id',
  });
export type MapDef = z.infer<typeof MAP_SCHEMA>;
