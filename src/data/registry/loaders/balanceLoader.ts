/**
 * Balance loader - locates and parses `content/balance/*.json`.
 *
 * Each balance file is a singleton (one EXP curve, one stat curve, etc.) keyed by
 * its `id` field, e.g. `balance.exp_curve`. The registry validates per-id.
 */

import { getLogger } from '@core/Logger';

const log = getLogger('balanceLoader');

const BALANCE_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/balance/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectBalanceRecords = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [path, raw] of Object.entries(BALANCE_MODULES)) {
    if (raw === null || typeof raw !== 'object') {
      log.warn('balance file is not an object', { path });
      continue;
    }
    const obj = raw as { id?: unknown };
    if (typeof obj.id !== 'string') {
      log.warn('balance file missing string "id"', { path });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(out, obj.id)) {
      log.warn('duplicate balance id across files', { id: obj.id, path });
    }
    out[obj.id] = raw;
  }
  return out;
};
