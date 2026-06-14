/**
 * Save system stub - in-memory adapter only for Phase 0.
 *
 * IndexedDB and Tauri filesystem adapters land in later phases; the SaveStore
 * interface is what gameplay code consumes.
 */

import { getLogger } from '@core/Logger';

export interface SaveSlotMeta {
  readonly slot: string;
  readonly savedAt: number;
  readonly version: number;
  readonly playtimeMs: number;
}

export interface SaveData<TPayload = unknown> {
  readonly meta: SaveSlotMeta;
  readonly payload: TPayload;
}

export interface SaveStore {
  list(): Promise<readonly SaveSlotMeta[]>;
  read<T = unknown>(slot: string): Promise<SaveData<T> | null>;
  write<T = unknown>(slot: string, data: SaveData<T>): Promise<void>;
  delete(slot: string): Promise<void>;
}

export const SAVE_VERSION = 1;
export const AUTO_SLOT = 'auto';
export const QUICK_SLOT = 'quick';

export class InMemorySaveStore implements SaveStore {
  private readonly slots = new Map<string, SaveData>();
  private readonly log = getLogger('Save:InMemory');

  list(): Promise<readonly SaveSlotMeta[]> {
    const out = [...this.slots.values()].map((d) => d.meta);
    return Promise.resolve(out);
  }

  read<T = unknown>(slot: string): Promise<SaveData<T> | null> {
    const v = this.slots.get(slot);
    return Promise.resolve(v === undefined ? null : (v as SaveData<T>));
  }

  write<T = unknown>(slot: string, data: SaveData<T>): Promise<void> {
    this.slots.set(slot, data as SaveData);
    this.log.debug(`wrote slot "${slot}"`);
    return Promise.resolve();
  }

  delete(slot: string): Promise<void> {
    this.slots.delete(slot);
    return Promise.resolve();
  }
}
