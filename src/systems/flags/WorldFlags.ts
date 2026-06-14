/**
 * WorldFlags - typed key/value store for world state.
 *
 * Flags drive NPC reactions, quest progression, dialogue branches, and ending
 * variants. Values are limited to boolean / number / string for save-friendliness.
 */

import type { EventBus } from '@core/EventBus';

export type FlagValue = boolean | number | string;

export interface FlagCondition {
  readonly flag: string;
  readonly equals: FlagValue;
}

export class WorldFlags {
  private readonly map = new Map<string, FlagValue>();

  constructor(private readonly bus?: EventBus<{ 'flag.set': { flag: string; value: FlagValue } }>) {}

  has(flag: string): boolean {
    return this.map.has(flag);
  }

  get(flag: string): FlagValue | undefined {
    return this.map.get(flag);
  }

  /** Returns the previous value, or undefined if unset. */
  set(flag: string, value: FlagValue): FlagValue | undefined {
    const previous = this.map.get(flag);
    this.map.set(flag, value);
    if (previous !== value && this.bus !== undefined) {
      this.bus.emit('flag.set', { flag, value });
    }
    return previous;
  }

  delete(flag: string): boolean {
    return this.map.delete(flag);
  }

  clear(): void {
    this.map.clear();
  }

  satisfies(condition: FlagCondition): boolean {
    return this.map.get(condition.flag) === condition.equals;
  }

  satisfiesAll(conditions: readonly FlagCondition[]): boolean {
    for (const c of conditions) {
      if (!this.satisfies(c)) {
        return false;
      }
    }
    return true;
  }

  serialize(): Record<string, FlagValue> {
    return Object.fromEntries(this.map.entries());
  }

  load(snapshot: Readonly<Record<string, FlagValue>>): void {
    this.map.clear();
    for (const [k, v] of Object.entries(snapshot)) {
      this.map.set(k, v);
    }
  }
}
