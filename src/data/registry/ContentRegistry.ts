/**
 * ContentRegistry - the single source of truth for all content definitions.
 *
 * Phase 0 shipped Item.
 * Phase 1 added the Balance bundle.
 * Phase 2 adds Skill, StatusEffect, Monster, and LootTable. Cross-reference checks
 * run after schema validation to catch dangling ids (e.g. monster references a
 * loot table that does not exist).
 */

import { getLogger } from '@core/Logger';
import { err, ok, type Result } from '@core/Result';
import { validate, ValidationError } from '@core/Schema';

import {
  DAMAGE_FORMULA_SCHEMA,
  EXP_CURVE_SCHEMA,
  PLAYER_BASE_SCHEMA,
  STAT_CURVES_SCHEMA,
  type DamageFormula,
  type ExpCurve,
  type PlayerBase,
  type StatCurves,
} from '../schemas/balance.schema';
import { ITEM_SCHEMA, type Item } from '../schemas/item.schema';
import { LOOT_TABLE_SCHEMA, type LootTable } from '../schemas/loot_table.schema';
import { MONSTER_SCHEMA, type Monster } from '../schemas/monster.schema';
import { SKILL_SCHEMA, type Skill } from '../schemas/skill.schema';
import { STATUS_EFFECT_SCHEMA, type StatusEffect } from '../schemas/status_effect.schema';

export type ContentKind =
  | 'item'
  | 'balance'
  | 'skill'
  | 'status_effect'
  | 'monster'
  | 'loot_table';

export interface ContentSource {
  readonly items: Readonly<Record<string, unknown>>;
  readonly balance: Readonly<Record<string, unknown>>;
  readonly skills: Readonly<Record<string, unknown>>;
  readonly statusEffects: Readonly<Record<string, unknown>>;
  readonly monsters: Readonly<Record<string, unknown>>;
  readonly lootTables: Readonly<Record<string, unknown>>;
}

export interface ValidationReport {
  readonly errors: readonly ValidationError[];
  readonly counts: Readonly<Record<ContentKind, number>>;
}

export interface BalanceBundle {
  readonly playerBase: PlayerBase;
  readonly expCurve: ExpCurve;
  readonly statCurves: StatCurves;
  readonly damageFormula: DamageFormula;
}

const REQUIRED_BALANCE_IDS = [
  'balance.player_base',
  'balance.exp_curve',
  'balance.stat_curves',
  'balance.damage_formula',
] as const;

const issue = (source: string, path: string, code: string, message: string): ValidationError =>
  new ValidationError({ source, issues: [{ path, code, message }] });

export class ContentRegistry {
  private readonly items = new Map<string, Item>();
  private readonly skills = new Map<string, Skill>();
  private readonly statusEffects = new Map<string, StatusEffect>();
  private readonly monsters = new Map<string, Monster>();
  private readonly lootTables = new Map<string, LootTable>();
  private balance: BalanceBundle | null = null;
  private loaded = false;
  private readonly log = getLogger('ContentRegistry');

  loadAll(source: ContentSource): Result<ValidationReport, ValidationError[]> {
    this.reset();
    const errors: ValidationError[] = [];

    this.loadItems(source.items, errors);
    const balance = this.loadBalance(source.balance, errors);
    this.loadStatusEffects(source.statusEffects, errors);
    this.loadSkills(source.skills, errors);
    this.loadLootTables(source.lootTables, errors);
    this.loadMonsters(source.monsters, errors);

    if (errors.length === 0) {
      this.crossReferenceCheck(errors);
    }

    if (errors.length > 0) {
      return err(errors);
    }

    this.balance = balance;
    this.loaded = true;
    const counts: Record<ContentKind, number> = {
      item: this.items.size,
      balance: REQUIRED_BALANCE_IDS.length,
      skill: this.skills.size,
      status_effect: this.statusEffects.size,
      monster: this.monsters.size,
      loot_table: this.lootTables.size,
    };
    this.log.info(
      `content loaded: ${counts.item} items, ${counts.skill} skills, ${counts.status_effect} status, ${counts.monster} monsters, ${counts.loot_table} loot tables`,
    );
    return ok({ errors: [], counts });
  }

  private reset(): void {
    this.items.clear();
    this.skills.clear();
    this.statusEffects.clear();
    this.monsters.clear();
    this.lootTables.clear();
    this.balance = null;
    this.loaded = false;
  }

  private loadItems(
    items: Readonly<Record<string, unknown>>,
    errors: ValidationError[],
  ): void {
    for (const [id, raw] of Object.entries(items)) {
      const v = validate(ITEM_SCHEMA, raw, `item:${id}`);
      if (!v.ok) {
        errors.push(v.error);
        continue;
      }
      if (v.value.id !== id) {
        errors.push(
          issue(
            `item:${id}`,
            'id',
            'id_mismatch',
            `Item key "${id}" does not match id "${v.value.id}"`,
          ),
        );
        continue;
      }
      if (this.items.has(v.value.id)) {
        errors.push(issue(`item:${id}`, 'id', 'duplicate_id', `Duplicate item id "${v.value.id}"`));
        continue;
      }
      this.items.set(v.value.id, v.value);
    }
  }

  private loadStatusEffects(
    src: Readonly<Record<string, unknown>>,
    errors: ValidationError[],
  ): void {
    for (const [id, raw] of Object.entries(src)) {
      const v = validate(STATUS_EFFECT_SCHEMA, raw, `status_effect:${id}`);
      if (!v.ok) {
        errors.push(v.error);
        continue;
      }
      if (v.value.id !== id) {
        errors.push(
          issue(
            `status_effect:${id}`,
            'id',
            'id_mismatch',
            `Status effect key "${id}" does not match id "${v.value.id}"`,
          ),
        );
        continue;
      }
      this.statusEffects.set(v.value.id, v.value);
    }
  }

  private loadSkills(
    src: Readonly<Record<string, unknown>>,
    errors: ValidationError[],
  ): void {
    for (const [id, raw] of Object.entries(src)) {
      const v = validate(SKILL_SCHEMA, raw, `skill:${id}`);
      if (!v.ok) {
        errors.push(v.error);
        continue;
      }
      if (v.value.id !== id) {
        errors.push(
          issue(
            `skill:${id}`,
            'id',
            'id_mismatch',
            `Skill key "${id}" does not match id "${v.value.id}"`,
          ),
        );
        continue;
      }
      this.skills.set(v.value.id, v.value);
    }
  }

  private loadLootTables(
    src: Readonly<Record<string, unknown>>,
    errors: ValidationError[],
  ): void {
    for (const [id, raw] of Object.entries(src)) {
      const v = validate(LOOT_TABLE_SCHEMA, raw, `loot_table:${id}`);
      if (!v.ok) {
        errors.push(v.error);
        continue;
      }
      if (v.value.id !== id) {
        errors.push(
          issue(
            `loot_table:${id}`,
            'id',
            'id_mismatch',
            `Loot table key "${id}" does not match id "${v.value.id}"`,
          ),
        );
        continue;
      }
      this.lootTables.set(v.value.id, v.value);
    }
  }

  private loadMonsters(
    src: Readonly<Record<string, unknown>>,
    errors: ValidationError[],
  ): void {
    for (const [id, raw] of Object.entries(src)) {
      const v = validate(MONSTER_SCHEMA, raw, `monster:${id}`);
      if (!v.ok) {
        errors.push(v.error);
        continue;
      }
      if (v.value.id !== id) {
        errors.push(
          issue(
            `monster:${id}`,
            'id',
            'id_mismatch',
            `Monster key "${id}" does not match id "${v.value.id}"`,
          ),
        );
        continue;
      }
      this.monsters.set(v.value.id, v.value);
    }
  }

  private crossReferenceCheck(errors: ValidationError[]): void {
    // Skills -> StatusEffects
    for (const skill of this.skills.values()) {
      for (const eff of skill.effects) {
        if (!this.statusEffects.has(eff.statusId)) {
          errors.push(
            issue(
              `skill:${skill.id}`,
              'effects.statusId',
              'unknown_ref',
              `Skill references unknown status effect "${eff.statusId}"`,
            ),
          );
        }
      }
    }

    // Monsters -> Skills, LootTable
    for (const m of this.monsters.values()) {
      for (const sid of m.skills) {
        if (!this.skills.has(sid)) {
          errors.push(
            issue(
              `monster:${m.id}`,
              'skills',
              'unknown_ref',
              `Monster references unknown skill "${sid}"`,
            ),
          );
        }
      }
      if (!this.lootTables.has(m.lootTableId)) {
        errors.push(
          issue(
            `monster:${m.id}`,
            'lootTableId',
            'unknown_ref',
            `Monster references unknown loot table "${m.lootTableId}"`,
          ),
        );
      }
    }

    // LootTables -> Items
    for (const lt of this.lootTables.values()) {
      for (const entry of lt.entries) {
        if (entry.kind === 'item' && !this.items.has(entry.itemId)) {
          errors.push(
            issue(
              `loot_table:${lt.id}`,
              'entries.itemId',
              'unknown_ref',
              `Loot table references unknown item "${entry.itemId}"`,
            ),
          );
        }
      }
    }
  }

  private loadBalance(
    balance: Readonly<Record<string, unknown>>,
    errors: ValidationError[],
  ): BalanceBundle | null {
    const slot: { -readonly [K in keyof BalanceBundle]?: BalanceBundle[K] } = {};

    for (const id of REQUIRED_BALANCE_IDS) {
      const raw = balance[id];
      if (raw === undefined) {
        errors.push(
          issue(`balance:${id}`, 'id', 'missing', `Required balance file "${id}" is missing`),
        );
        continue;
      }
      switch (id) {
        case 'balance.player_base': {
          const v = validate(PLAYER_BASE_SCHEMA, raw, `balance:${id}`);
          if (!v.ok) {
            errors.push(v.error);
          } else {
            slot.playerBase = v.value;
          }
          break;
        }
        case 'balance.exp_curve': {
          const v = validate(EXP_CURVE_SCHEMA, raw, `balance:${id}`);
          if (!v.ok) {
            errors.push(v.error);
          } else {
            slot.expCurve = v.value;
          }
          break;
        }
        case 'balance.stat_curves': {
          const v = validate(STAT_CURVES_SCHEMA, raw, `balance:${id}`);
          if (!v.ok) {
            errors.push(v.error);
          } else {
            slot.statCurves = v.value;
          }
          break;
        }
        case 'balance.damage_formula': {
          const v = validate(DAMAGE_FORMULA_SCHEMA, raw, `balance:${id}`);
          if (!v.ok) {
            errors.push(v.error);
          } else {
            slot.damageFormula = v.value;
          }
          break;
        }
      }
    }

    if (
      slot.playerBase === undefined ||
      slot.expCurve === undefined ||
      slot.statCurves === undefined ||
      slot.damageFormula === undefined
    ) {
      return null;
    }
    return slot as BalanceBundle;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  // ---------- accessors ----------

  getItem(id: string): Item | undefined {
    return this.items.get(id);
  }
  requireItem(id: string): Item {
    const v = this.items.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: item "${id}" not found`);
    }
    return v;
  }
  listItems(filter?: (i: Item) => boolean): Item[] {
    const all = [...this.items.values()];
    return filter === undefined ? all : all.filter(filter);
  }
  itemCount(): number {
    return this.items.size;
  }

  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }
  requireSkill(id: string): Skill {
    const v = this.skills.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: skill "${id}" not found`);
    }
    return v;
  }

  getStatusEffect(id: string): StatusEffect | undefined {
    return this.statusEffects.get(id);
  }
  requireStatusEffect(id: string): StatusEffect {
    const v = this.statusEffects.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: status effect "${id}" not found`);
    }
    return v;
  }

  getMonster(id: string): Monster | undefined {
    return this.monsters.get(id);
  }
  requireMonster(id: string): Monster {
    const v = this.monsters.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: monster "${id}" not found`);
    }
    return v;
  }
  listMonsters(): Monster[] {
    return [...this.monsters.values()];
  }

  getLootTable(id: string): LootTable | undefined {
    return this.lootTables.get(id);
  }
  requireLootTable(id: string): LootTable {
    const v = this.lootTables.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: loot table "${id}" not found`);
    }
    return v;
  }

  getBalance(): BalanceBundle {
    if (this.balance === null) {
      throw new Error('ContentRegistry: balance not loaded');
    }
    return this.balance;
  }
}
