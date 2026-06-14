/**
 * StatusContainer - runtime container for active status effects on an actor.
 *
 * Handles three stacking modes (refresh / stack / ignore), tick scheduling for DOT,
 * and a control mask for movement/casting/acting blocks.
 */

import type { StatusEffect } from '@data/schemas/status_effect.schema';

export interface ActiveStatus {
  readonly effect: StatusEffect;
  remainingMs: number;
  /** Time since last tick (DOT only). */
  tickAccumulatorMs: number;
  /** Number of times the effect has been applied (1..maxStacks). */
  stacks: number;
  /** Source identifier used for diagnostics and selective removal. */
  readonly sourceId: string;
  /** Cached scaling stat value at apply-time (so caster stats stay consistent). */
  readonly sourceScalingValue: number;
}

export interface DotEvent {
  readonly effectId: string;
  readonly damage: number;
  readonly element: StatusEffect['body'] extends { element: infer E } ? E : never;
  readonly stacks: number;
}

export class StatusContainer {
  private readonly active: ActiveStatus[] = [];

  apply(effect: StatusEffect, sourceId: string, scalingValue: number): void {
    const existing = this.active.find((s) => s.effect.id === effect.id);
    if (existing !== undefined) {
      switch (effect.stacking) {
        case 'refresh':
          existing.remainingMs = effect.durationMs;
          return;
        case 'stack':
          existing.stacks = Math.min(effect.maxStacks, existing.stacks + 1);
          existing.remainingMs = effect.durationMs;
          return;
        case 'ignore':
          return;
      }
    }
    this.active.push({
      effect,
      remainingMs: effect.durationMs,
      tickAccumulatorMs: 0,
      stacks: 1,
      sourceId,
      sourceScalingValue: scalingValue,
    });
  }

  removeBySource(sourceId: string): number {
    const before = this.active.length;
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i]?.sourceId === sourceId) {
        this.active.splice(i, 1);
      }
    }
    return before - this.active.length;
  }

  removeById(effectId: string): boolean {
    const idx = this.active.findIndex((s) => s.effect.id === effectId);
    if (idx < 0) {
      return false;
    }
    this.active.splice(idx, 1);
    return true;
  }

  clear(): void {
    this.active.length = 0;
  }

  has(effectId: string): boolean {
    return this.active.some((s) => s.effect.id === effectId);
  }

  list(): readonly ActiveStatus[] {
    return this.active;
  }

  /** Aggregate "blocks" from active control effects. */
  controlBlocks(): { act: boolean; cast: boolean; move: boolean } {
    let act = false;
    let cast = false;
    let move = false;
    for (const s of this.active) {
      if (s.effect.body.kind !== 'control') {
        continue;
      }
      for (const b of s.effect.body.blocks) {
        if (b === 'act') {
          act = true;
        } else if (b === 'cast') {
          cast = true;
        } else if (b === 'move') {
          move = true;
        }
      }
    }
    return { act, cast, move };
  }

  /**
   * Tick all active effects forward. Returns DOT events that fired this tick.
   * Expired effects are removed.
   */
  update(deltaMs: number): DotEvent[] {
    const events: DotEvent[] = [];
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i];
      if (s === undefined) {
        continue;
      }
      s.remainingMs -= deltaMs;
      if (s.effect.body.kind === 'dot') {
        s.tickAccumulatorMs += deltaMs;
        const interval = s.effect.body.tickIntervalMs;
        while (s.tickAccumulatorMs >= interval && s.remainingMs > -interval) {
          s.tickAccumulatorMs -= interval;
          const dmg =
            (s.effect.body.base + s.effect.body.coef * s.sourceScalingValue) * s.stacks;
          events.push({
            effectId: s.effect.id,
            damage: Math.max(0, Math.floor(dmg)),
            // The discriminated body has `element` for dot kind.
            element: s.effect.body.element as DotEvent['element'],
            stacks: s.stacks,
          });
        }
      }
      if (s.remainingMs <= 0) {
        this.active.splice(i, 1);
      }
    }
    return events;
  }
}
