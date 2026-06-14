import { buildIdMap } from './helpers';

const MAP_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/maps/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectMapRecords = (): Record<string, unknown> =>
  buildIdMap(MAP_MODULES, 'map');
