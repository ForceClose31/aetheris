/**
 * BasicAi - simple state-machine AI for Phase 2.
 *
 * States: idle -> aggro -> chase -> attack -> flee (low HP).
 * Distances are pixel-space; the WorldScene supplies positions and time.
 */

import type { MonsterInstance } from '@domain/actors/MonsterInstance';

export type AiState = 'idle' | 'chase' | 'attack' | 'flee';

export interface AiTuning {
  /** Distance below which the monster aggros onto the player. */
  readonly aggroRange: number;
  /** Distance below which the monster will fire its primary skill. */
  readonly attackRange: number;
  /** HP ratio threshold (0..1) under which the monster flees. */
  readonly fleeHpRatio: number;
  /** Movement speed in px/sec. */
  readonly speed: number;
  /** Reaction delay applied between state changes (ms). */
  readonly reactionMs: number;
}

export const DEFAULT_AI_TUNING: AiTuning = {
  aggroRange: 70,
  attackRange: 18,
  fleeHpRatio: 0,
  speed: 50,
  reactionMs: 100,
};

export interface AiInput {
  readonly distanceToPlayer: number;
  readonly hpRatio: number;
  readonly canAttack: boolean;
  readonly deltaMs: number;
}

export interface AiOutput {
  readonly state: AiState;
  /** Direction multiplier toward the player (-1 flee, 0 idle, 1 chase). */
  readonly moveTowardPlayer: number;
  readonly attack: boolean;
}

export class BasicAi {
  private state: AiState = 'idle';
  private cooldownMs = 0;

  constructor(
    private readonly monster: MonsterInstance,
    private readonly tuning: AiTuning = DEFAULT_AI_TUNING,
  ) {}

  getState(): AiState {
    return this.state;
  }

  step(input: AiInput): AiOutput {
    if (this.cooldownMs > 0) {
      this.cooldownMs -= input.deltaMs;
    }
    const tuning = this.tuning;
    const next = this.computeNextState(input);

    if (next !== this.state && this.cooldownMs <= 0) {
      this.state = next;
      this.cooldownMs = tuning.reactionMs;
    }

    if (this.monster.isDead()) {
      return { state: this.state, moveTowardPlayer: 0, attack: false };
    }

    switch (this.state) {
      case 'idle':
        return { state: 'idle', moveTowardPlayer: 0, attack: false };
      case 'chase':
        return { state: 'chase', moveTowardPlayer: 1, attack: false };
      case 'attack':
        return { state: 'attack', moveTowardPlayer: 0, attack: input.canAttack };
      case 'flee':
        return { state: 'flee', moveTowardPlayer: -1, attack: false };
    }
  }

  private computeNextState(input: AiInput): AiState {
    if (input.hpRatio <= this.tuning.fleeHpRatio && this.tuning.fleeHpRatio > 0) {
      return 'flee';
    }
    if (input.distanceToPlayer <= this.tuning.attackRange) {
      return 'attack';
    }
    if (input.distanceToPlayer <= this.tuning.aggroRange) {
      return 'chase';
    }
    return 'idle';
  }
}
