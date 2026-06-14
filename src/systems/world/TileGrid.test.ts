import type { MapDef } from '@data/schemas/map.schema';
import { describe, expect, it } from 'vitest';


import {
  isWalkableTile,
  mapPixelHeight,
  mapPixelWidth,
  tileAt,
  tileToWorld,
  worldToTile,
} from './TileGrid';

const sampleMap = (): MapDef => ({
  id: 'map.test',
  name: { en: 'T' },
  type: 'town',
  tileSize: 16,
  tiles: [
    [1, 1, 1, 1],
    [1, 0, 5, 1],
    [1, 5, 0, 1],
    [1, 1, 1, 1],
  ],
  defaultSpawn: 's',
  spawns: [{ id: 's', pos: [1, 1] }],
  exits: [],
  npcs: [],
  monsters: [],
  indoor: false,
});

describe('TileGrid', () => {
  it('tileAt returns the right code and 1 (blocking) outside bounds', () => {
    const m = sampleMap();
    expect(tileAt(m, 1, 1)).toBe(0);
    expect(tileAt(m, 99, 99)).toBe(1);
    expect(tileAt(m, -1, 1)).toBe(1);
  });

  it('isWalkableTile reflects the BLOCKING set', () => {
    const m = sampleMap();
    expect(isWalkableTile(m, 1, 1)).toBe(true);
    expect(isWalkableTile(m, 0, 0)).toBe(false);
  });

  it('worldToTile and tileToWorld round-trip on tile centers', () => {
    const m = sampleMap();
    const [x, y] = tileToWorld(m, 2, 1);
    expect(worldToTile(m, x, y)).toEqual([2, 1]);
  });

  it('mapPixelWidth/Height multiply tileSize by extents', () => {
    const m = sampleMap();
    expect(mapPixelWidth(m)).toBe(4 * 16);
    expect(mapPixelHeight(m)).toBe(4 * 16);
  });
});
