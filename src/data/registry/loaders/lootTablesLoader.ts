import { buildIdMap } from './helpers';

const LOOT_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/loot_tables/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectLootTableRecords = (): Record<string, unknown> =>
  buildIdMap(LOOT_MODULES, 'loot_table');
