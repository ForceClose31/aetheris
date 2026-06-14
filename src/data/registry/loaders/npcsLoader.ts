import { buildIdMap } from './helpers';

const NPC_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/npcs/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectNpcRecords = (): Record<string, unknown> =>
  buildIdMap(NPC_MODULES, 'npc');
