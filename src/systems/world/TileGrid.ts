/**
 * Tile registry - which tile codes block movement.
 */

import type { MapDef } from '@data/schemas/map.schema';

export const BLOCKING_TILES = new Set<number>([1, 3]);

export const tileAt = (map: MapDef, col: number, row: number): number => {
  const r = map.tiles[row];
  if (r === undefined) {
    return 1; // out of bounds: blocking
  }
  const t = r[col];
  return t ?? 1;
};

export const isWalkableTile = (map: MapDef, col: number, row: number): boolean => {
  const code = tileAt(map, col, row);
  return !BLOCKING_TILES.has(code);
};

/** Convert pixel (x,y) to (col,row). */
export const worldToTile = (map: MapDef, x: number, y: number): [number, number] => {
  const col = Math.floor(x / map.tileSize);
  const row = Math.floor(y / map.tileSize);
  return [col, row];
};

/** Convert (col,row) to centered pixel (x,y). */
export const tileToWorld = (map: MapDef, col: number, row: number): [number, number] => [
  col * map.tileSize + map.tileSize / 2,
  row * map.tileSize + map.tileSize / 2,
];

export const mapPixelWidth = (map: MapDef): number =>
  (map.tiles[0]?.length ?? 0) * map.tileSize;

export const mapPixelHeight = (map: MapDef): number => map.tiles.length * map.tileSize;
