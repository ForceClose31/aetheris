import { describe, expect, it } from 'vitest';

import { WorldClock } from './Time';

describe('WorldClock', () => {
  it('rolls minutes, hours, days correctly with the default scale', () => {
    // Default: 60 real seconds per game hour -> 1000ms per game minute.
    const clock = new WorldClock();
    clock.update(1000); // 1 minute
    expect(clock.now()).toMatchObject({ day: 0, hour: 0, minute: 1 });

    clock.update(59 * 1000); // +59 minutes -> hour 1
    expect(clock.now()).toMatchObject({ day: 0, hour: 1, minute: 0 });

    clock.update(23 * 60 * 1000); // +23 hours -> next day
    expect(clock.now()).toMatchObject({ day: 1, hour: 0, minute: 0 });
  });

  it('honors a custom secondsPerGameHour', () => {
    // 120 real seconds per game hour -> 2000ms per game minute.
    const clock = new WorldClock({ secondsPerGameHour: 120 });
    clock.update(1999);
    expect(clock.now().minute).toBe(0);
    clock.update(1);
    expect(clock.now().minute).toBe(1);
  });

  it('emits one tick per elapsed in-game minute', () => {
    const clock = new WorldClock();
    let ticks = 0;
    clock.onTick(() => {
      ticks++;
    });
    clock.update(2500); // 2 minutes (500ms remainder kept)
    expect(ticks).toBe(2);
    clock.update(500); // total 3000ms across 2 calls -> +1 minute
    expect(ticks).toBe(3);
  });

  it('pause() halts progression', () => {
    const clock = new WorldClock({ paused: true });
    clock.update(60_000);
    expect(clock.now().minute).toBe(0);
    clock.resume();
    clock.update(60_000);
    expect(clock.now().hour).toBe(1);
  });

  it('serialize/fromSerialized round-trips', () => {
    const a = new WorldClock();
    a.update(10 * 60 * 1000); // 10 minutes
    const snap = a.serialize();
    const b = WorldClock.fromSerialized(snap);
    expect(b.now()).toEqual(a.now());
  });

  it('rejects invalid configuration', () => {
    expect(() => new WorldClock({ secondsPerGameHour: 0 })).toThrow();
    expect(() => new WorldClock({ secondsPerGameHour: -1 })).toThrow();
    const clock = new WorldClock();
    expect(() => clock.setMinutes(-1)).toThrow();
    expect(() => clock.setMinutes(Number.NaN)).toThrow();
  });
});
