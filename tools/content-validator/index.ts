/**
 * content-validator - CLI that validates every JSON file under `content/` against
 * its schema, plus structural checks (id-vs-filename match, duplicate ids,
 * cross-references between skills/status/monsters/items/loot).
 *
 * Used in CI; also useful as a pre-commit hook target.
 *
 * Run: pnpm content:validate
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAMAGE_FORMULA_SCHEMA,
  EXP_CURVE_SCHEMA,
  PLAYER_BASE_SCHEMA,
  STAT_CURVES_SCHEMA,
} from '../../src/data/schemas/balance.schema';
import { ITEM_SCHEMA } from '../../src/data/schemas/item.schema';
import { LOOT_TABLE_SCHEMA } from '../../src/data/schemas/loot_table.schema';
import { MONSTER_SCHEMA } from '../../src/data/schemas/monster.schema';
import { SKILL_SCHEMA } from '../../src/data/schemas/skill.schema';
import { STATUS_EFFECT_SCHEMA } from '../../src/data/schemas/status_effect.schema';

import type { ZodTypeAny } from 'zod';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const CONTENT_DIR = join(ROOT, 'content');

interface Issue {
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

const walkJson = async (dir: string): Promise<string[]> => {
  let stats;
  try {
    stats = await stat(dir);
  } catch {
    return [];
  }
  if (!stats.isDirectory()) {
    return [];
  }
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkJson(p)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(p);
    }
  }
  return out;
};

const readJson = async (file: string): Promise<unknown> => {
  const raw = await readFile(file, 'utf8');
  return JSON.parse(raw) as unknown;
};

const collectZodIssues = (
  schema: ZodTypeAny,
  raw: unknown,
  rel: string,
  issues: Issue[],
): { id?: string } | null => {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        file: rel,
        path: issue.path.length === 0 ? '<root>' : issue.path.join('.'),
        message: `${issue.message} (${issue.code})`,
      });
    }
    return null;
  }
  return parsed.data as { id?: string };
};

interface KindSpec {
  readonly dir: string;
  readonly tag: string;
  readonly schema: ZodTypeAny;
}

const validateKind = async (
  spec: KindSpec,
  issues: Issue[],
  parsed: Map<string, unknown>,
): Promise<void> => {
  const dir = join(CONTENT_DIR, spec.dir);
  const files = await walkJson(dir);
  const seen = new Map<string, string>();

  for (const file of files) {
    const rel = relative(ROOT, file).split(sep).join('/');
    let raw: unknown;
    try {
      raw = await readJson(file);
    } catch (e) {
      issues.push({
        file: rel,
        path: '<file>',
        message: `Invalid JSON: ${(e as Error).message}`,
      });
      continue;
    }

    const data = collectZodIssues(spec.schema, raw, rel, issues);
    if (data === null || typeof data.id !== 'string') {
      continue;
    }

    const id = data.id;
    const filenameId = file.split(sep).pop()?.replace(/\.json$/, '') ?? '';
    if (filenameId !== id) {
      issues.push({
        file: rel,
        path: 'id',
        message: `filename "${filenameId}" must match id "${id}"`,
      });
    }
    const existing = seen.get(id);
    if (existing !== undefined) {
      issues.push({
        file: rel,
        path: 'id',
        message: `duplicate id "${id}" (also in ${existing})`,
      });
    } else {
      seen.set(id, rel);
      parsed.set(id, data);
    }
  }
};

const BALANCE_FILES: Readonly<
  { id: string; filename: string; schema: ZodTypeAny }[]
> = [
  { id: 'balance.player_base', filename: 'player_base.json', schema: PLAYER_BASE_SCHEMA },
  { id: 'balance.exp_curve', filename: 'exp_curve.json', schema: EXP_CURVE_SCHEMA },
  { id: 'balance.stat_curves', filename: 'stat_curves.json', schema: STAT_CURVES_SCHEMA },
  {
    id: 'balance.damage_formula',
    filename: 'damage_formula.json',
    schema: DAMAGE_FORMULA_SCHEMA,
  },
];

const validateBalance = async (issues: Issue[]): Promise<void> => {
  const balanceDir = join(CONTENT_DIR, 'balance');
  for (const spec of BALANCE_FILES) {
    const file = join(balanceDir, spec.filename);
    const rel = relative(ROOT, file).split(sep).join('/');
    let raw: unknown;
    try {
      raw = await readJson(file);
    } catch (e) {
      issues.push({
        file: rel,
        path: '<file>',
        message: `Missing or invalid JSON: ${(e as Error).message}`,
      });
      continue;
    }
    const parsed = collectZodIssues(spec.schema, raw, rel, issues);
    if (parsed !== null && parsed.id !== spec.id) {
      issues.push({
        file: rel,
        path: 'id',
        message: `expected id "${spec.id}", got "${String(parsed.id)}"`,
      });
    }
  }
};

const crossRefCheck = (
  items: Map<string, unknown>,
  skills: Map<string, unknown>,
  status: Map<string, unknown>,
  monsters: Map<string, unknown>,
  loot: Map<string, unknown>,
  issues: Issue[],
): void => {
  for (const [id, raw] of skills) {
    const data = raw as { effects?: { statusId: string }[] };
    for (const eff of data.effects ?? []) {
      if (!status.has(eff.statusId)) {
        issues.push({
          file: `skill:${id}`,
          path: 'effects.statusId',
          message: `unknown status effect "${eff.statusId}"`,
        });
      }
    }
  }
  for (const [id, raw] of monsters) {
    const data = raw as { skills?: string[]; lootTableId: string };
    for (const sid of data.skills ?? []) {
      if (!skills.has(sid)) {
        issues.push({
          file: `monster:${id}`,
          path: 'skills',
          message: `unknown skill "${sid}"`,
        });
      }
    }
    if (!loot.has(data.lootTableId)) {
      issues.push({
        file: `monster:${id}`,
        path: 'lootTableId',
        message: `unknown loot table "${data.lootTableId}"`,
      });
    }
  }
  for (const [id, raw] of loot) {
    const data = raw as {
      entries?: ({ kind: 'item'; itemId: string } | { kind: 'gold' } | { kind: 'nothing' })[];
    };
    for (const entry of data.entries ?? []) {
      if (entry.kind === 'item' && !items.has(entry.itemId)) {
        issues.push({
          file: `loot_table:${id}`,
          path: 'entries.itemId',
          message: `unknown item "${entry.itemId}"`,
        });
      }
    }
  }
};

const main = async (): Promise<number> => {
  const issues: Issue[] = [];
  const items = new Map<string, unknown>();
  const skills = new Map<string, unknown>();
  const status = new Map<string, unknown>();
  const monsters = new Map<string, unknown>();
  const loot = new Map<string, unknown>();

  await validateKind({ dir: 'items', tag: 'item', schema: ITEM_SCHEMA }, issues, items);
  await validateKind({ dir: 'skills', tag: 'skill', schema: SKILL_SCHEMA }, issues, skills);
  await validateKind(
    { dir: 'status_effects', tag: 'status_effect', schema: STATUS_EFFECT_SCHEMA },
    issues,
    status,
  );
  await validateKind(
    { dir: 'monsters', tag: 'monster', schema: MONSTER_SCHEMA },
    issues,
    monsters,
  );
  await validateKind(
    { dir: 'loot_tables', tag: 'loot_table', schema: LOOT_TABLE_SCHEMA },
    issues,
    loot,
  );
  await validateBalance(issues);

  if (issues.length === 0) {
    crossRefCheck(items, skills, status, monsters, loot, issues);
  }

  if (issues.length === 0) {
    process.stdout.write(
      `content:validate OK (${items.size} items, ${skills.size} skills, ${status.size} status, ${monsters.size} monsters, ${loot.size} loot tables)\n`,
    );
    return 0;
  }

  process.stderr.write(`content:validate FAILED (${issues.length} issue(s))\n`);
  for (const i of issues) {
    process.stderr.write(`  ${i.file} :: ${i.path} :: ${i.message}\n`);
  }
  return 1;
};

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    process.stderr.write(`content:validate crashed: ${String(e)}\n`);
    process.exit(2);
  });
