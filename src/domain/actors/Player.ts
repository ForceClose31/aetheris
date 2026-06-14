/**
 * Player - the protagonist's domain object, decoupled from any rendering layer.
 *
 * The Phaser sprite for the player lives in the WorldScene; this class is the
 * authoritative source for state (level, EXP, stats, points, current vital pools).
 */

import { applyExp, applyStatGrowth, type ApplyExpResult, type LevelState } from
  '@systems/leveling/Leveling';

import type { ExpCurve, PlayerBase, StatCurves } from '@data/schemas/balance.schema';

import { computeDerivedStats, type DerivedStats } from './DerivedStats';
import { applyAllModifiers, type Modifier } from './Modifier';

import type { StatBlock } from './StatBlock';

export interface PlayerSnapshot {
  readonly level: number;
  readonly exp: number;
  readonly freePoints: number;
  readonly base: StatBlock;
  readonly hp: number;
  readonly mp: number;
  readonly stamina: number;
}

export class Player {
  private level: number;
  private exp: number;
  private freePoints: number;
  private base: StatBlock;
  private modifiers: Modifier[] = [];
  private hp: number;
  private mp: number;
  private stamina: number;

  constructor(private readonly playerBase: PlayerBase) {
    this.level = playerBase.startingLevel;
    this.exp = 0;
    this.freePoints = 0;
    this.base = { ...playerBase.base };
    const derived = this.computeDerived();
    this.hp = derived.hp;
    this.mp = derived.mp;
    this.stamina = derived.maxStamina;
  }

  /** Returns a tuple of effective StatBlock + DerivedStats after modifiers. */
  computeDerived(): StatBlock & DerivedStats {
    const effective = applyAllModifiers(this.base, this.modifiers);
    const derived = computeDerivedStats(effective);
    return { ...effective, ...derived };
  }

  getLevel(): number {
    return this.level;
  }
  getExp(): number {
    return this.exp;
  }
  getFreePoints(): number {
    return this.freePoints;
  }
  getBaseStats(): StatBlock {
    return { ...this.base };
  }
  getHp(): number {
    return this.hp;
  }
  getMp(): number {
    return this.mp;
  }
  getStamina(): number {
    return this.stamina;
  }

  /** Award `expGain`, level up if possible, and apply per-level stat growth. */
  awardExp(curve: ExpCurve, curves: StatCurves, expGain: number): ApplyExpResult {
    const before: LevelState = {
      level: this.level,
      exp: this.exp,
      freePoints: this.freePoints,
    };
    const result = applyExp(curve, curves, before, expGain);
    if (result.leveledUp && result.award !== null) {
      this.base = applyStatGrowth(this.base, result.award.statGrowth);
      // Refill HP/MP on level up; stamina tops up too. Tunable later via balance.
      const derived = this.computeDerived();
      this.hp = derived.hp;
      this.mp = derived.mp;
      this.stamina = derived.maxStamina;
    }
    this.level = result.state.level;
    this.exp = result.state.exp;
    this.freePoints = result.state.freePoints;
    return result;
  }

  /** Spend `points` free points on `stat` (no negative spend; clamps if too many). */
  allocatePoints(stat: keyof StatBlock, points: number): boolean {
    if (points <= 0 || points > this.freePoints) {
      return false;
    }
    this.base = { ...this.base, [stat]: this.base[stat] + points };
    this.freePoints -= points;
    return true;
  }

  addModifier(mod: Modifier): void {
    this.modifiers.push(mod);
  }

  /** Remove all modifiers from a given source (e.g. unequipping an item). */
  removeModifiersBySource(source: string): number {
    const before = this.modifiers.length;
    this.modifiers = this.modifiers.filter((m) => m.source !== source);
    return before - this.modifiers.length;
  }

  damage(amount: number): number {
    const dmg = Math.max(0, Math.floor(amount));
    const derived = this.computeDerived();
    this.hp = Math.max(0, Math.min(derived.hp, this.hp - dmg));
    return dmg;
  }

  heal(amount: number): number {
    const derived = this.computeDerived();
    const before = this.hp;
    this.hp = Math.max(0, Math.min(derived.hp, this.hp + Math.max(0, Math.floor(amount))));
    return this.hp - before;
  }

  spendMp(amount: number): boolean {
    if (amount < 0) {
      return false;
    }
    if (this.mp < amount) {
      return false;
    }
    this.mp -= amount;
    return true;
  }

  spendStamina(amount: number): boolean {
    if (amount < 0) {
      return false;
    }
    if (this.stamina < amount) {
      return false;
    }
    this.stamina -= amount;
    return true;
  }

  regenStamina(amount: number): void {
    const derived = this.computeDerived();
    this.stamina = Math.min(derived.maxStamina, this.stamina + Math.max(0, amount));
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  snapshot(): PlayerSnapshot {
    return {
      level: this.level,
      exp: this.exp,
      freePoints: this.freePoints,
      base: { ...this.base },
      hp: this.hp,
      mp: this.mp,
      stamina: this.stamina,
    };
  }
}
