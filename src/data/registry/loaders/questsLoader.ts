import { buildIdMap } from './helpers';

const QUEST_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/quests/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectQuestRecords = (): Record<string, unknown> =>
  buildIdMap(QUEST_MODULES, 'quest');
