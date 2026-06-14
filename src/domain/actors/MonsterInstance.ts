/**
 * MonsterInstance - runtime monster spawned in the world.
 *
 * Stats are derived from the monster definition's `base + growth * (level - 1)`.
 * The instance owns its own StatusContainer and HP/MP pools.
 */

import type { Monster } from '@data/schemas/monster.schema';
import { computeDerivedStats, type DerivedStats } from '@domain/actors/DerivedStats';
import type { Element, StatBlock, StatKey } from '@domain/actors/StatBlock';
import { StatusContainer } from '@systems/combat/StatusContainer';



export interface MonsterStats extends StatBlock, DerivedStats {}

const STAT_KEYS: readonly StatKey[] = ['hp', 'mp', 'str', 'vit', 'agi', 'dex', 'int', 'luk'];

const buildStatBlock = (def: Monster, level: number): StatBlock => {
  const out: { [K in StatKey]: number } = {
    hp: 0,
    mp: 0,
    str: 0,
    vit: 0,
    agi: 0,
    dex: 0,
    int: 0,
    luk: 0,
  };
  const lvFactor = Math.max(0, level - 1);
  for (const k of STAT_KEYS) {
    out[k] = Math.floor(def.base[k] + def.growth[k] * lvFactor);
  }
  return out;
};

export class MonsterInstance {
  private readonly stats: MonsterStats;
  private hp: number;
  private mp: number;
  private dead = false;
  private readonly statuses = new StatusContainer();
  /** Cooldown remaining for each known skill id, in ms. */
  private readonly cooldowns = new Map<string, number>();

  constructor(public readonly def: Monster, public readonly level: number) {
    if (level < def.levelRange[0] || level > def.levelRange[1]) {
      // Allow out-of-range spawns but warn-only at higher layers.
    }
    const block = buildStatBlock(def, level);
    const derived = computeDerivedStats(block);
    this.stats = { ...block, ...derived };
    this.hp = this.stats.hp;
    this.mp = this.stats.mp;
  }

  getStats(): MonsterStats {
    return this.stats;
  }
  getHp(): number {
    return this.hp;
  }
  getMp(): number {
    return this.mp;
  }
  isDead(): boolean {
    return this.dead;
  }
  getStatusContainer(): StatusContainer {
    return this.statuses;
  }
  getResistance(element: Element): number {
    return this.def.resistances[element] ?? 0;
  }
  getResistances(): Partial<Record<Element, number>> {
    return this.def.resistances;
  }

  damage(amount: number): number {
    const dmg = Math.max(0, Math.floor(amount));
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) {
      this.dead = true;
    }
    return dmg;
  }

  /** Tick cooldowns and statuses; returns DOT events for the caller to apply as damage. */
  update(deltaMs: number): ReturnType<StatusContainer['update']> {
    for (const [k, v] of this.cooldowns) {
      const next = v - deltaMs;
      if (next <= 0) {
        this.cooldowns.delete(k);
      } else {
        this.cooldowns.set(k, next);
      }
    }
    return this.statuses.update(deltaMs);
  }

  isOnCooldown(skillId: string): boolean {
    return (this.cooldowns.get(skillId) ?? 0) > 0;
  }
  startCooldown(skillId: string, ms: number): void {
    if (ms > 0) {
      this.cooldowns.set(skillId, ms);
    }
  }
}
