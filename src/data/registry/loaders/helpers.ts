/**
 * Generic content loader factory - reduces boilerplate for new kinds.
 *
 * Each kind has a glob and a record map keyed by `id`. Vite resolves the glob
 * at build time, so adding a file under `content/<kind>/...` requires no source
 * changes elsewhere.
 */

import { getLogger } from '@core/Logger';

const log = getLogger('contentLoader');

export const buildIdMap = (
  modules: Readonly<Record<string, unknown>>,
  tag: string,
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [path, raw] of Object.entries(modules)) {
    if (raw === null || typeof raw !== 'object') {
      log.warn(`${tag} file is not an object`, { path });
      continue;
    }
    const obj = raw as { id?: unknown };
    if (typeof obj.id !== 'string') {
      log.warn(`${tag} file missing string "id"`, { path });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(out, obj.id)) {
      log.warn(`duplicate ${tag} id across files`, { id: obj.id, path });
    }
    out[obj.id] = raw;
  }
  return out;
};
