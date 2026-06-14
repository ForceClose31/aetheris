import { buildIdMap } from './helpers';

const MONSTER_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/monsters/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectMonsterRecords = (): Record<string, unknown> =>
  buildIdMap(MONSTER_MODULES, 'monster');
