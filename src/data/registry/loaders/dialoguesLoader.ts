import { buildIdMap } from './helpers';

const DIALOGUE_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/dialogues/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectDialogueRecords = (): Record<string, unknown> =>
  buildIdMap(DIALOGUE_MODULES, 'dialogue');
