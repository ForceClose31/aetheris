import { buildIdMap } from './helpers';

const SKILL_MODULES = import.meta.glob<{ default: unknown }>(
  '/content/skills/**/*.json',
  { eager: true, import: 'default' },
) as Record<string, unknown>;

export const collectSkillRecords = (): Record<string, unknown> =>
  buildIdMap(SKILL_MODULES, 'skill');
