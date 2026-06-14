/**
 * Items loader - locates and parses all `content/items/**\/*.json` files.
 *
 * Vite's `import.meta.glob` resolves the file set at build time, so adding a new
 * item is purely a content drop. The validator tool uses the same set via Node fs
 * (see tools/content-validator/index.ts).
 */

import { getLogger } from '@core/Logger';

const log = getLogger('itemsLoader');

/** Eager-loaded item JSON modules. The path key is preserved for diagnostics. */
const ITEM_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/items/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectItemRecords = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [path, raw] of Object.entries(ITEM_MODULES)) {
    if (raw === null || typeof raw !== 'object') {
      log.warn(`item file is not an object`, { path });
      continue;
    }
    const obj = raw as { id?: unknown };
    if (typeof obj.id !== 'string') {
      log.warn(`item file missing string "id"`, { path });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(out, obj.id)) {
      log.warn(`duplicate item id across files`, { id: obj.id, path });
    }
    out[obj.id] = raw;
  }
  return out;
};
