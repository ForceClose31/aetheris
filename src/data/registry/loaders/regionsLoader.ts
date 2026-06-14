import { buildIdMap } from './helpers';

const REGION_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/regions/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectRegionRecords = (): Record<string, unknown> =>
  buildIdMap(REGION_MODULES, 'region');
