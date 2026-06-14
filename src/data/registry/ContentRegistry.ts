/**
 * ContentRegistry - the single source of truth for all content definitions.
 *
 * Phase 0 shipped the Item kind. Phase 1 adds the Balance kind (player baseline,
 * EXP curve, stat curves, damage formula). Each balance file is a singleton keyed
 * by `id` matching one of the BALANCE_IDS literals.
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

export type ContentKind = 'item' | 'balance';

export interface ContentSource {
  /** Items keyed by id, raw (untyped) JSON. */
  readonly items: Readonly<Record<string, unknown>>;
  /** Balance singletons keyed by id. */
  readonly balance: Readonly<Record<string, unknown>>;
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

export class ContentRegistry {
  private readonly items = new Map<string, Item>();
  private balance: BalanceBundle | null = null;
  private loaded = false;
  private readonly log = getLogger('ContentRegistry');

  /** Load and validate the full content set. Returns Err with all collected issues. */
  loadAll(source: ContentSource): Result<ValidationReport, ValidationError[]> {
    this.items.clear();
    this.balance = null;
    const errors: ValidationError[] = [];

    this.loadItems(source.items, errors);
    const balance = this.loadBalance(source.balance, errors);

    if (errors.length > 0) {
      return err(errors);
    }

    this.balance = balance;
    this.loaded = true;
    const report: ValidationReport = {
      errors: [],
      counts: { item: this.items.size, balance: REQUIRED_BALANCE_IDS.length },
    };
    this.log.info(
      `loaded ${this.items.size} item(s); balance: player_base/exp_curve/stat_curves/damage_formula`,
    );
    return ok(report);
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
          new ValidationError({
            source: `item:${id}`,
            issues: [
              {
                path: 'id',
                code: 'id_mismatch',
                message: `Item key "${id}" does not match id "${v.value.id}"`,
              },
            ],
          }),
        );
        continue;
      }
      if (this.items.has(v.value.id)) {
        errors.push(
          new ValidationError({
            source: `item:${id}`,
            issues: [
              {
                path: 'id',
                code: 'duplicate_id',
                message: `Duplicate item id "${v.value.id}"`,
              },
            ],
          }),
        );
        continue;
      }
      this.items.set(v.value.id, v.value);
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
          new ValidationError({
            source: `balance:${id}`,
            issues: [
              {
                path: 'id',
                code: 'missing',
                message: `Required balance file "${id}" is missing`,
              },
            ],
          }),
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

  getBalance(): BalanceBundle {
    if (this.balance === null) {
      throw new Error('ContentRegistry: balance not loaded');
    }
    return this.balance;
  }
}
