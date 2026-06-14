/**
 * WorldState - top-level run-time bag for what the player sees:
 * current map id, current spawn marker, and a snapshot of WorldFlags + quests.
 *
 * Persists to save format later; for now it is a pure in-memory holder.
 */

import type { ContentRegistry } from '@data/registry/ContentRegistry';

export class WorldState {
  private currentMapId: string;
  private currentSpawnMarker: string;

  constructor(private readonly registry: ContentRegistry, startingMapId: string) {
    const map = this.registry.requireMap(startingMapId);
    this.currentMapId = map.id;
    this.currentSpawnMarker = map.defaultSpawn;
  }

  getCurrentMapId(): string {
    return this.currentMapId;
  }

  getCurrentSpawnMarker(): string {
    return this.currentSpawnMarker;
  }

  /** Returns true if the transition is valid (target map + marker exist). */
  transitionTo(mapId: string, marker: string): boolean {
    const map = this.registry.getMap(mapId);
    if (map === undefined) {
      return false;
    }
    if (!map.spawns.some((s) => s.id === marker)) {
      return false;
    }
    this.currentMapId = mapId;
    this.currentSpawnMarker = marker;
    return true;
  }
}
