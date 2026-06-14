/**
 * EventBus - typed pub/sub for cross-system signals.
 *
 * No system imports another's internals; they communicate through a typed event map.
 * Add new events by extending GameEventMap (or feeding a custom map to a fresh bus).
 */

import { getLogger } from './Logger';

export type EventHandler<T> = (payload: T) => void;
export type Unsubscribe = () => void;

/**
 * The canonical event map for the whole game. Systems extend this map by
 * augmenting the `GameEventMapBase` interface in shared types or `.d.ts` files:
 *
 *   declare module '@core/EventBus' {
 *     interface GameEventMapBase {
 *       'monster.killed': { readonly id: string };
 *     }
 *   }
 *
 * Then `GameEventMap` (a derived type) satisfies the bus's `Record<string, unknown>`
 * constraint while keeping the augmentable surface as an interface.
 */
export interface GameEventMapBase {
  /** Internal smoke-test event used by tests and debug pings. */
  'core.ping': { readonly at: number };
}

export type GameEventMap = { [K in keyof GameEventMapBase]: GameEventMapBase[K] };

export class EventBus<TMap extends Record<string, unknown> = GameEventMap> {
  private readonly handlers = new Map<keyof TMap, Set<EventHandler<unknown>>>();
  private readonly log = getLogger('EventBus');

  on<K extends keyof TMap>(event: K, handler: EventHandler<TMap[K]>): Unsubscribe {
    let set = this.handlers.get(event);
    if (set === undefined) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);
    return () => this.off(event, handler);
  }

  once<K extends keyof TMap>(event: K, handler: EventHandler<TMap[K]>): Unsubscribe {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off<K extends keyof TMap>(event: K, handler: EventHandler<TMap[K]>): void {
    const set = this.handlers.get(event);
    if (set === undefined) {
      return;
    }
    set.delete(handler as EventHandler<unknown>);
    if (set.size === 0) {
      this.handlers.delete(event);
    }
  }

  emit<K extends keyof TMap>(event: K, payload: TMap[K]): void {
    const set = this.handlers.get(event);
    if (set === undefined) {
      return;
    }
    // Snapshot to allow handlers that unsubscribe themselves during dispatch.
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (error) {
        this.log.error(`handler for "${String(event)}" threw`, error);
      }
    }
  }

  listenerCount<K extends keyof TMap>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  clear(): void {
    this.handlers.clear();
  }
}
