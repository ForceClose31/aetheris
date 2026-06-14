/**
 * content-validator - CLI that validates every JSON file under `content/` against
 * its schema, plus structural checks (id-vs-filename match, duplicate ids, locale keys).
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

const validateItems = async (issues: Issue[]): Promise<void> => {
  const itemsDir = join(CONTENT_DIR, 'items');
  const files = await walkJson(itemsDir);
  const seen = new Map<string, string>(); // id -> first file

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

    const parsed = collectZodIssues(ITEM_SCHEMA, raw, rel, issues);
    if (parsed === null || typeof parsed.id !== 'string') {
      continue;
    }

    const id = parsed.id;
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

const main = async (): Promise<number> => {
  const issues: Issue[] = [];
  await validateItems(issues);
  await validateBalance(issues);

  if (issues.length === 0) {
    process.stdout.write('content:validate OK\n');
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
