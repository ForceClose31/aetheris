import { buildIdMap } from './helpers';

const STATUS_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/status_effects/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectStatusEffectRecords = (): Record<string, unknown> =>
  buildIdMap(STATUS_MODULES, 'status_effect');
