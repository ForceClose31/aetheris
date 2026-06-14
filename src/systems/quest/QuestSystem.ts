/**
 * QuestSystem - manages quest lifecycle: prereq checks, objective tracking,
 * and reward award on completion.
 *
 * Quest progress is tracked per quest as { state, counters: Map<objectiveIndex, count> }.
 * The system listens to events fed in by the WorldScene (monster.killed, item.acquired,
 * map.entered, npc.talked) plus flag changes from WorldFlags.
 */

import { getLogger } from '@core/Logger';
import type { ContentRegistry } from '@data/registry/ContentRegistry';
import type { Quest, QuestObjective } from '@data/schemas/quest.schema';
import type { Player } from '@domain/actors/Player';
import type { Inventory } from '@domain/inventory/Inventory';
import type { WorldFlags } from '@systems/flags/WorldFlags';


export type QuestState = 'locked' | 'available' | 'active' | 'completed';

export interface QuestProgress {
  readonly questId: string;
  state: QuestState;
  /** Per-objective counter (kill count, collect count, etc.). */
  counters: number[];
}

export interface QuestEvent {
  readonly kind: 'monster.killed' | 'item.acquired' | 'map.entered' | 'npc.talked';
  readonly id: string;
  readonly count?: number;
}

export interface QuestUpdate {
  readonly questId: string;
  readonly objectiveIndex: number;
  readonly progress: number;
  readonly target: number;
}

export interface QuestCompletion {
  readonly questId: string;
  readonly rewardsApplied: boolean;
}

const objectiveTarget = (obj: QuestObjective): number => {
  switch (obj.kind) {
    case 'kill':
    case 'collect':
      return obj.count;
    default:
      return 1;
  }
};

const objectiveAccept = (
  obj: QuestObjective,
  ev: QuestEvent,
  flags: WorldFlags,
): number => {
  switch (obj.kind) {
    case 'kill':
      return ev.kind === 'monster.killed' && ev.id === obj.monsterId ? ev.count ?? 1 : 0;
    case 'collect':
      return ev.kind === 'item.acquired' && ev.id === obj.itemId ? ev.count ?? 1 : 0;
    case 'reach':
      return ev.kind === 'map.entered' && ev.id === obj.mapId ? 1 : 0;
    case 'talk':
      return ev.kind === 'npc.talked' && ev.id === obj.npcId ? 1 : 0;
    case 'flag':
      return flags.satisfies(obj.condition) ? 1 : 0;
  }
};

export class QuestSystem {
  private readonly progress = new Map<string, QuestProgress>();
  private readonly log = getLogger('QuestSystem');

  constructor(
    private readonly registry: ContentRegistry,
    private readonly flags: WorldFlags,
    private readonly player: Player,
    private readonly inventory: Inventory,
  ) {
    for (const q of this.registry.listQuests()) {
      this.progress.set(q.id, {
        questId: q.id,
        state: 'locked',
        counters: q.objectives.map(() => 0),
      });
    }
  }

  /** Re-evaluate prereqs for all locked quests; auto-start if marked. */
  reevaluate(): { started: string[] } {
    const started: string[] = [];
    for (const quest of this.registry.listQuests()) {
      const prog = this.progress.get(quest.id);
      if (prog === undefined) {
        continue;
      }
      if (prog.state !== 'locked') {
        continue;
      }
      if (!this.flags.satisfiesAll(quest.prereqs)) {
        continue;
      }
      prog.state = quest.autoStart ? 'active' : 'available';
      if (prog.state === 'active') {
        started.push(quest.id);
      }
    }
    return { started };
  }

  acceptQuest(questId: string): boolean {
    const prog = this.progress.get(questId);
    if (prog === undefined || prog.state !== 'available') {
      return false;
    }
    prog.state = 'active';
    return true;
  }

  /** Apply an event to all active quests. Returns updates and any completions. */
  emit(event: QuestEvent): { updates: QuestUpdate[]; completed: QuestCompletion[] } {
    const updates: QuestUpdate[] = [];
    const completed: QuestCompletion[] = [];
    for (const quest of this.registry.listQuests()) {
      const prog = this.progress.get(quest.id);
      if (prog === undefined || prog.state !== 'active') {
        continue;
      }
      let advanced = false;
      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        if (obj === undefined) {
          continue;
        }
        const target = objectiveTarget(obj);
        const current = prog.counters[i] ?? 0;
        if (current >= target) {
          continue;
        }
        const delta = objectiveAccept(obj, event, this.flags);
        if (delta > 0) {
          const next = Math.min(target, current + delta);
          prog.counters[i] = next;
          advanced = true;
          updates.push({ questId: quest.id, objectiveIndex: i, progress: next, target });
        }
      }
      if (advanced && this.isQuestObjectivesMet(quest, prog)) {
        prog.state = 'completed';
        completed.push({ questId: quest.id, rewardsApplied: this.applyRewards(quest) });
      }
    }
    return { updates, completed };
  }

  private isQuestObjectivesMet(quest: Quest, prog: QuestProgress): boolean {
    for (let i = 0; i < quest.objectives.length; i++) {
      const obj = quest.objectives[i];
      if (obj === undefined) {
        continue;
      }
      const target = objectiveTarget(obj);
      if ((prog.counters[i] ?? 0) < target) {
        return false;
      }
    }
    return true;
  }

  private applyRewards(quest: Quest): boolean {
    const balance = this.registry.getBalance();
    if (quest.rewards.exp > 0) {
      this.player.awardExp(balance.expCurve, balance.statCurves, quest.rewards.exp);
    }
    if (quest.rewards.gold > 0) {
      this.inventory.addGold(quest.rewards.gold);
    }
    for (const reward of quest.rewards.items) {
      const item = this.registry.getItem(reward.itemId);
      if (item !== undefined) {
        this.inventory.add(item, reward.qty);
      }
    }
    for (const flag of quest.rewards.flagsSet) {
      this.flags.set(flag, true);
    }
    this.log.info(`quest "${quest.id}" completed; rewards applied`);
    return true;
  }

  getProgress(questId: string): QuestProgress | undefined {
    return this.progress.get(questId);
  }

  /** All active quests (for HUD). */
  activeQuests(): { quest: Quest; progress: QuestProgress }[] {
    const out: { quest: Quest; progress: QuestProgress }[] = [];
    for (const q of this.registry.listQuests()) {
      const p = this.progress.get(q.id);
      if (p?.state === 'active') {
        out.push({ quest: q, progress: p });
      }
    }
    return out;
  }
}
