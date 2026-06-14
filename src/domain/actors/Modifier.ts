/**
 * Modifier system - typed stat modifiers stacked in the order:
 *
 *   final = (base + sum(Flat)) * (1 + sum(%Add)) * product(1 + %Mult)
 *
 * Modifiers come from job growth, equipment stats, buffs, status effects, etc.
 * Each modifier carries a `source` for diagnostics and selective removal.
 */

import type { StatBlock, StatKey } from './StatBlock';

export type ModifierKind = 'flat' | 'add' | 'mult';

export interface Modifier {
  readonly stat: StatKey;
  readonly kind: ModifierKind;
  readonly value: number;
  readonly source: string;
}

export interface ModifierSummary {
  readonly flat: number;
  readonly add: number;
  readonly mult: number;
}

const EMPTY_SUMMARY: ModifierSummary = { flat: 0, add: 0, mult: 0 };

const summarize = (mods: readonly Modifier[], stat: StatKey): ModifierSummary => {
  let flat = 0;
  let add = 0;
  let mult = 1;
  for (const m of mods) {
    if (m.stat !== stat) {
      continue;
    }
    if (m.kind === 'flat') {
      flat += m.value;
    } else if (m.kind === 'add') {
      add += m.value;
    } else {
      mult *= 1 + m.value;
    }
  }
  // Return mult as `mult - 1` so summary stays additive-friendly. We multiply later.
  return { flat, add, mult: mult - 1 };
};

/** Apply modifiers to a single stat. Negative results are floored at 0 (gameplay choice). */
export const applyModifier = (base: number, summary: ModifierSummary): number => {
  const stage1 = base + summary.flat;
  const stage2 = stage1 * (1 + summary.add);
  const stage3 = stage2 * (1 + summary.mult);
  return Math.max(0, stage3);
};

export const summarizeModifiers = (
  mods: readonly Modifier[],
  stat: StatKey,
): ModifierSummary => (mods.length === 0 ? EMPTY_SUMMARY : summarize(mods, stat));

/** Apply all modifiers to every stat, returning a new (mutable) StatBlock. */
export const applyAllModifiers = (
  base: StatBlock,
  mods: readonly Modifier[],
): StatBlock => {
  const result: { [K in StatKey]: number } = { ...base };
  const stats: readonly StatKey[] = ['hp', 'mp', 'str', 'vit', 'agi', 'dex', 'int', 'luk'];
  for (const stat of stats) {
    const summary = summarizeModifiers(mods, stat);
    result[stat] = Math.floor(applyModifier(base[stat], summary));
  }
  return result;
};

/** Stable comparator for tests; orders by source then stat then kind. */
export const compareModifiers = (a: Modifier, b: Modifier): number =>
  a.source.localeCompare(b.source) ||
  a.stat.localeCompare(b.stat) ||
  a.kind.localeCompare(b.kind);
