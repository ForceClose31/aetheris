/**
 * Schedule resolver - given an NPC's schedule and the current world hour,
 * returns the slot covering that hour (or null if none applies).
 *
 * Wrapping (e.g. fromHour=20, toHour=6) is supported for night shifts.
 */

import type { Npc, NpcSchedule } from '@data/schemas/npc.schema';

export interface ResolvedSlot {
  readonly mapId: string;
  readonly pos: readonly [number, number];
  readonly dialogueId: string;
}

const matchesHour = (
  slot: NpcSchedule[number],
  hour: number,
): boolean => {
  if (slot.fromHour <= slot.toHour) {
    return hour >= slot.fromHour && hour <= slot.toHour;
  }
  // Wraps over midnight.
  return hour >= slot.fromHour || hour <= slot.toHour;
};

export const resolveNpcSlot = (npc: Npc, hour: number): ResolvedSlot | null => {
  if (npc.schedule.length === 0) {
    return null;
  }
  for (const slot of npc.schedule) {
    if (matchesHour(slot, hour)) {
      return {
        mapId: slot.mapId,
        pos: slot.pos,
        dialogueId: slot.dialogueId ?? npc.dialogueId,
      };
    }
  }
  return null;
};
