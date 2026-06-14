/**
 * SkillExecutor - validates costs/cooldowns, computes damage, applies effects.
 *
 * The executor is engine-agnostic. Spatial resolution (which targets fall in the
 * shape) is handled by the caller (typically WorldScene), and the result is fed
 * back here as `targets` so this module stays pure-logic and testable.
 */

import type { Rng } from '@core/Rng';

import type { MonsterInstance } from '@domain/actors/MonsterInstance';
import type { Player } from '@domain/actors/Player';

import type { ContentRegistry } from '@data/registry/ContentRegistry';
import type { DamageFormula } from '@data/schemas/balance.schema';
import type { Skill } from '@data/schemas/skill.schema';

import { computeDamage, type AttackerProfile, type DefenderProfile } from './Damage';

export interface SkillTargetResult {
  readonly target: MonsterInstance;
  readonly damage: number;
  readonly crit: boolean;
  readonly elementMultiplier: number;
  readonly statusesApplied: readonly string[];
}

export type SkillExecuteFailure =
  | { kind: 'unknown_skill' }
  | { kind: 'cooldown' }
  | { kind: 'insufficient_mp' }
  | { kind: 'insufficient_stamina' }
  | { kind: 'insufficient_hp' }
  | { kind: 'silenced' };

export interface SkillExecuteSuccess {
  readonly kind: 'ok';
  readonly skill: Skill;
  readonly results: readonly SkillTargetResult[];
}

export type SkillExecuteResult = SkillExecuteSuccess | (SkillExecuteFailure & { kind: SkillExecuteFailure['kind'] });

export interface PlayerCooldowns {
  isOnCooldown(skillId: string): boolean;
  startCooldown(skillId: string, ms: number): void;
}

export class SkillExecutor {
  constructor(
    private readonly registry: ContentRegistry,
    private readonly cooldowns: PlayerCooldowns,
    private readonly rng: Rng,
  ) {}

  execute(
    player: Player,
    skillId: string,
    targets: readonly MonsterInstance[],
    formula: DamageFormula,
  ): SkillExecuteResult {
    const skill = this.registry.getSkill(skillId);
    if (skill === undefined) {
      return { kind: 'unknown_skill' };
    }
    if (this.cooldowns.isOnCooldown(skillId)) {
      return { kind: 'cooldown' };
    }
    if (skill.cost.mp > 0 && !player.spendMp(skill.cost.mp)) {
      return { kind: 'insufficient_mp' };
    }
    if (skill.cost.stamina > 0 && !player.spendStamina(skill.cost.stamina)) {
      return { kind: 'insufficient_stamina' };
    }
    if (skill.cost.hp > 0) {
      if (player.getHp() <= skill.cost.hp) {
        return { kind: 'insufficient_hp' };
      }
      player.damage(skill.cost.hp);
    }

    const derived = player.computeDerived();
    const attacker: AttackerProfile = {
      atk: derived.atk,
      matk: derived.matk,
      stat: derived as unknown as Record<string, number>,
      critPct: derived.critPct,
      critDmg: derived.critDmg,
    };
    const attackerStatValue = derived[skill.power.scaling];

    const results: SkillTargetResult[] = [];
    for (const target of targets) {
      const targetStats = target.getStats();
      const defender: DefenderProfile = {
        def: targetStats.def,
        mdef: targetStats.mdef,
        resistances: target.getResistances(),
      };
      const out = computeDamage({
        attacker,
        defender,
        skill,
        attackerStatValue,
        formula,
        rng: this.rng,
      });
      target.damage(out.damage);

      const statusesApplied: string[] = [];
      for (const eff of skill.effects) {
        const fx = this.registry.getStatusEffect(eff.statusId);
        if (fx === undefined) {
          continue;
        }
        if (this.rng.next() <= eff.chance) {
          target
            .getStatusContainer()
            .apply(fx, `caster:player:${skill.id}`, attackerStatValue);
          statusesApplied.push(eff.statusId);
        }
      }

      results.push({
        target,
        damage: out.damage,
        crit: out.crit,
        elementMultiplier: out.elementMultiplier,
        statusesApplied,
      });
    }

    if (skill.cost.cooldownMs > 0) {
      this.cooldowns.startCooldown(skillId, skill.cost.cooldownMs);
    }
    return { kind: 'ok', skill, results };
  }
}
