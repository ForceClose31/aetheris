/**
 * Time - the world clock.
 *
 * A discrete in-game time with a configurable real-to-game scale. Systems subscribe
 * to tick callbacks; schedules and weather use this as their authority.
 *
 * Defaults: 1 in-game hour = 60 real seconds (per GDD).
 */

export interface WorldDate {
  readonly day: number; // 0-based day count since epoch
  readonly hour: number; // 0..23
  readonly minute: number; // 0..59
  readonly totalMinutes: number; // monotonic counter
}

export interface TimeOptions {
  /** Real seconds per in-game hour. Default 60 (GDD). */
  readonly secondsPerGameHour?: number;
  /** Starting minute since epoch. Default 0 (Day 0, 00:00). */
  readonly startMinutes?: number;
  /** Pause on construction. Default false. */
  readonly paused?: boolean;
}

export type TickListener = (date: WorldDate) => void;

export class WorldClock {
  private accumulatorMs = 0;
  private totalMinutes: number;
  private paused: boolean;
  private readonly msPerGameMinute: number;
  private readonly listeners = new Set<TickListener>();

  constructor(opts: TimeOptions = {}) {
    const sph = opts.secondsPerGameHour ?? 60;
    if (sph <= 0) {
      throw new Error('WorldClock: secondsPerGameHour must be > 0');
    }
    this.msPerGameMinute = (sph * 1000) / 60;
    this.totalMinutes = Math.max(0, Math.floor(opts.startMinutes ?? 0));
    this.paused = opts.paused ?? false;
  }

  /** Advance by `realDeltaMs`; emits ticks for every elapsed in-game minute. */
  update(realDeltaMs: number): void {
    if (this.paused || realDeltaMs <= 0) {
      return;
    }
    this.accumulatorMs += realDeltaMs;
    while (this.accumulatorMs >= this.msPerGameMinute) {
      this.accumulatorMs -= this.msPerGameMinute;
      this.totalMinutes++;
      const date = this.now();
      for (const listener of [...this.listeners]) {
        listener(date);
      }
    }
  }

  pause(): void {
    this.paused = true;
  }
  resume(): void {
    this.paused = false;
  }
  isPaused(): boolean {
    return this.paused;
  }

  setMinutes(totalMinutes: number): void {
    if (totalMinutes < 0 || !Number.isFinite(totalMinutes)) {
      throw new Error(`WorldClock.setMinutes: invalid ${totalMinutes}`);
    }
    this.totalMinutes = Math.floor(totalMinutes);
    this.accumulatorMs = 0;
  }

  now(): WorldDate {
    const total = this.totalMinutes;
    const day = Math.floor(total / (24 * 60));
    const hour = Math.floor((total % (24 * 60)) / 60);
    const minute = total % 60;
    return { day, hour, minute, totalMinutes: total };
  }

  onTick(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  serialize(): { totalMinutes: number; paused: boolean } {
    return { totalMinutes: this.totalMinutes, paused: this.paused };
  }

  static fromSerialized(
    state: { totalMinutes: number; paused: boolean },
    opts?: TimeOptions,
  ): WorldClock {
    return new WorldClock({
      ...opts,
      startMinutes: state.totalMinutes,
      paused: state.paused,
    });
  }
}
