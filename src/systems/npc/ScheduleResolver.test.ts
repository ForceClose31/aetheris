import type { Npc } from '@data/schemas/npc.schema';
import { describe, expect, it } from 'vitest';


import { resolveNpcSlot } from './ScheduleResolver';

const baseNpc: Npc = {
  id: 'npc.test',
  name: { en: 'Test' },
  dialogueId: 'dlg.default',
  schedule: [
    { fromHour: 7, toHour: 18, mapId: 'map.day', pos: [1, 1] },
    { fromHour: 19, toHour: 6, mapId: 'map.night', pos: [2, 2], dialogueId: 'dlg.night' },
  ],
  placeholderColor: '888888',
};

describe('resolveNpcSlot', () => {
  it('matches the day slot during day hours', () => {
    const slot = resolveNpcSlot(baseNpc, 10);
    expect(slot?.mapId).toBe('map.day');
    expect(slot?.dialogueId).toBe('dlg.default');
  });

  it('matches the wrapping night slot at midnight', () => {
    const slot = resolveNpcSlot(baseNpc, 1);
    expect(slot?.mapId).toBe('map.night');
    expect(slot?.dialogueId).toBe('dlg.night');
  });

  it('matches the wrapping night slot at 22:00', () => {
    const slot = resolveNpcSlot(baseNpc, 22);
    expect(slot?.mapId).toBe('map.night');
  });

  it('returns null when no schedule entries match', () => {
    const sparse: Npc = { ...baseNpc, schedule: [{ fromHour: 12, toHour: 14, mapId: 'm', pos: [0, 0] }] };
    expect(resolveNpcSlot(sparse, 1)).toBeNull();
  });

  it('returns null when the schedule is empty', () => {
    expect(resolveNpcSlot({ ...baseNpc, schedule: [] }, 12)).toBeNull();
  });
});
