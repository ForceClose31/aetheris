/**
 * ContentRegistry - the single source of truth for all content definitions.
 *
 * Phase 0 shipped Item.
 * Phase 1 added the Balance bundle.
 * Phase 2 added Skill, StatusEffect, Monster, LootTable.
 * Phase 3 adds Region, Map, Npc, Dialogue, Quest. Cross-reference checks expand
 * to validate map.exits[].to.mapId, map.npcs[].npcId, npc.dialogueId, npc.shop.itemId,
 * dialogue.start, quest.objectives.{monsterId,itemId,npcId,mapId}, region.mapIds.
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
import { DIALOGUE_SCHEMA, type Dialogue } from '../schemas/dialogue.schema';
import { ITEM_SCHEMA, type Item } from '../schemas/item.schema';
import { LOOT_TABLE_SCHEMA, type LootTable } from '../schemas/loot_table.schema';
import { MAP_SCHEMA, type MapDef } from '../schemas/map.schema';
import { MONSTER_SCHEMA, type Monster } from '../schemas/monster.schema';
import { NPC_SCHEMA, type Npc } from '../schemas/npc.schema';
import { QUEST_SCHEMA, type Quest } from '../schemas/quest.schema';
import { REGION_SCHEMA, type Region } from '../schemas/region.schema';
import { SKILL_SCHEMA, type Skill } from '../schemas/skill.schema';
import { STATUS_EFFECT_SCHEMA, type StatusEffect } from '../schemas/status_effect.schema';

export type ContentKind =
  | 'item'
  | 'balance'
  | 'skill'
  | 'status_effect'
  | 'monster'
  | 'loot_table'
  | 'region'
  | 'map'
  | 'npc'
  | 'dialogue'
  | 'quest';

export interface ContentSource {
  readonly items: Readonly<Record<string, unknown>>;
  readonly balance: Readonly<Record<string, unknown>>;
  readonly skills: Readonly<Record<string, unknown>>;
  readonly statusEffects: Readonly<Record<string, unknown>>;
  readonly monsters: Readonly<Record<string, unknown>>;
  readonly lootTables: Readonly<Record<string, unknown>>;
  readonly regions: Readonly<Record<string, unknown>>;
  readonly maps: Readonly<Record<string, unknown>>;
  readonly npcs: Readonly<Record<string, unknown>>;
  readonly dialogues: Readonly<Record<string, unknown>>;
  readonly quests: Readonly<Record<string, unknown>>;
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
  private readonly regions = new Map<string, Region>();
  private readonly maps = new Map<string, MapDef>();
  private readonly npcs = new Map<string, Npc>();
  private readonly dialogues = new Map<string, Dialogue>();
  private readonly quests = new Map<string, Quest>();
  private balance: BalanceBundle | null = null;
  private loaded = false;
  private readonly log = getLogger('ContentRegistry');

  loadAll(source: ContentSource): Result<ValidationReport, ValidationError[]> {
    this.reset();
    const errors: ValidationError[] = [];

    this.loadKind(source.items, ITEM_SCHEMA, 'item', this.items, errors);
    const balance = this.loadBalance(source.balance, errors);
    this.loadKind(source.statusEffects, STATUS_EFFECT_SCHEMA, 'status_effect', this.statusEffects, errors);
    this.loadKind(source.skills, SKILL_SCHEMA, 'skill', this.skills, errors);
    this.loadKind(source.lootTables, LOOT_TABLE_SCHEMA, 'loot_table', this.lootTables, errors);
    this.loadKind(source.monsters, MONSTER_SCHEMA, 'monster', this.monsters, errors);
    this.loadKind(source.dialogues, DIALOGUE_SCHEMA, 'dialogue', this.dialogues, errors);
    this.loadKind(source.npcs, NPC_SCHEMA, 'npc', this.npcs, errors);
    this.loadKind(source.maps, MAP_SCHEMA, 'map', this.maps, errors);
    this.loadKind(source.regions, REGION_SCHEMA, 'region', this.regions, errors);
    this.loadKind(source.quests, QUEST_SCHEMA, 'quest', this.quests, errors);

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
      region: this.regions.size,
      map: this.maps.size,
      npc: this.npcs.size,
      dialogue: this.dialogues.size,
      quest: this.quests.size,
    };
    this.log.info(
      `content loaded: ${counts.item} items, ${counts.skill} skills, ${counts.status_effect} status, ${counts.monster} monsters, ${counts.loot_table} loot tables, ${counts.region} regions, ${counts.map} maps, ${counts.npc} npcs, ${counts.dialogue} dialogues, ${counts.quest} quests`,
    );
    return ok({ errors: [], counts });
  }

  private reset(): void {
    this.items.clear();
    this.skills.clear();
    this.statusEffects.clear();
    this.monsters.clear();
    this.lootTables.clear();
    this.regions.clear();
    this.maps.clear();
    this.npcs.clear();
    this.dialogues.clear();
    this.quests.clear();
    this.balance = null;
    this.loaded = false;
  }

  private loadKind<T extends { id: string }>(
    src: Readonly<Record<string, unknown>>,
    schema: Parameters<typeof validate>[0],
    tag: string,
    target: Map<string, T>,
    errors: ValidationError[],
  ): void {
    for (const [id, raw] of Object.entries(src)) {
      const v = validate(schema, raw, `${tag}:${id}`);
      if (!v.ok) {
        errors.push(v.error);
        continue;
      }
      const value = v.value as T;
      if (value.id !== id) {
        errors.push(
          issue(
            `${tag}:${id}`,
            'id',
            'id_mismatch',
            `${tag} key "${id}" does not match id "${value.id}"`,
          ),
        );
        continue;
      }
      if (target.has(value.id)) {
        errors.push(
          issue(`${tag}:${id}`, 'id', 'duplicate_id', `Duplicate ${tag} id "${value.id}"`),
        );
        continue;
      }
      target.set(value.id, value);
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
            issue(`monster:${m.id}`, 'skills', 'unknown_ref', `Monster references unknown skill "${sid}"`),
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

    // Maps -> Maps (exits), NPCs (placements), Monsters (spawn)
    for (const m of this.maps.values()) {
      for (const ex of m.exits) {
        const dest = this.maps.get(ex.to.mapId);
        if (dest === undefined) {
          errors.push(
            issue(
              `map:${m.id}`,
              `exits.${ex.id}.to.mapId`,
              'unknown_ref',
              `Map exit "${ex.id}" references unknown map "${ex.to.mapId}"`,
            ),
          );
          continue;
        }
        if (!dest.spawns.some((s) => s.id === ex.to.marker)) {
          errors.push(
            issue(
              `map:${m.id}`,
              `exits.${ex.id}.to.marker`,
              'unknown_ref',
              `Map exit "${ex.id}" references unknown marker "${ex.to.marker}" on "${ex.to.mapId}"`,
            ),
          );
        }
      }
      for (const placement of m.npcs) {
        if (!this.npcs.has(placement.npcId)) {
          errors.push(
            issue(
              `map:${m.id}`,
              'npcs.npcId',
              'unknown_ref',
              `Map references unknown npc "${placement.npcId}"`,
            ),
          );
        }
      }
      for (const spawn of m.monsters) {
        if (!this.monsters.has(spawn.monsterId)) {
          errors.push(
            issue(
              `map:${m.id}`,
              'monsters.monsterId',
              'unknown_ref',
              `Map references unknown monster "${spawn.monsterId}"`,
            ),
          );
        }
      }
    }

    // NPCs -> Dialogues, Items (shop)
    for (const npc of this.npcs.values()) {
      if (!this.dialogues.has(npc.dialogueId)) {
        errors.push(
          issue(
            `npc:${npc.id}`,
            'dialogueId',
            'unknown_ref',
            `NPC references unknown dialogue "${npc.dialogueId}"`,
          ),
        );
      }
      for (const sched of npc.schedule) {
        if (!this.maps.has(sched.mapId)) {
          errors.push(
            issue(
              `npc:${npc.id}`,
              'schedule.mapId',
              'unknown_ref',
              `NPC schedule references unknown map "${sched.mapId}"`,
            ),
          );
        }
        if (sched.dialogueId !== undefined && !this.dialogues.has(sched.dialogueId)) {
          errors.push(
            issue(
              `npc:${npc.id}`,
              'schedule.dialogueId',
              'unknown_ref',
              `NPC schedule references unknown dialogue "${sched.dialogueId}"`,
            ),
          );
        }
      }
      if (npc.shop !== undefined) {
        for (const stock of npc.shop.sells) {
          if (!this.items.has(stock.itemId)) {
            errors.push(
              issue(
                `npc:${npc.id}`,
                'shop.sells.itemId',
                'unknown_ref',
                `NPC shop references unknown item "${stock.itemId}"`,
              ),
            );
          }
        }
      }
    }

    // Regions -> Maps
    for (const r of this.regions.values()) {
      for (const mid of r.mapIds) {
        if (!this.maps.has(mid)) {
          errors.push(
            issue(
              `region:${r.id}`,
              'mapIds',
              'unknown_ref',
              `Region references unknown map "${mid}"`,
            ),
          );
        }
      }
    }

    // Quests -> Monsters / Items / NPCs / Maps
    for (const q of this.quests.values()) {
      for (const obj of q.objectives) {
        if (obj.kind === 'kill' && !this.monsters.has(obj.monsterId)) {
          errors.push(
            issue(
              `quest:${q.id}`,
              'objectives.monsterId',
              'unknown_ref',
              `Quest references unknown monster "${obj.monsterId}"`,
            ),
          );
        }
        if (obj.kind === 'collect' && !this.items.has(obj.itemId)) {
          errors.push(
            issue(
              `quest:${q.id}`,
              'objectives.itemId',
              'unknown_ref',
              `Quest references unknown item "${obj.itemId}"`,
            ),
          );
        }
        if (obj.kind === 'talk' && !this.npcs.has(obj.npcId)) {
          errors.push(
            issue(
              `quest:${q.id}`,
              'objectives.npcId',
              'unknown_ref',
              `Quest references unknown npc "${obj.npcId}"`,
            ),
          );
        }
        if (obj.kind === 'reach' && !this.maps.has(obj.mapId)) {
          errors.push(
            issue(
              `quest:${q.id}`,
              'objectives.mapId',
              'unknown_ref',
              `Quest references unknown map "${obj.mapId}"`,
            ),
          );
        }
      }
      for (const r of q.rewards.items) {
        if (!this.items.has(r.itemId)) {
          errors.push(
            issue(
              `quest:${q.id}`,
              'rewards.items.itemId',
              'unknown_ref',
              `Quest reward references unknown item "${r.itemId}"`,
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

  getRegion(id: string): Region | undefined {
    return this.regions.get(id);
  }
  requireRegion(id: string): Region {
    const v = this.regions.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: region "${id}" not found`);
    }
    return v;
  }
  listRegions(): Region[] {
    return [...this.regions.values()];
  }

  getMap(id: string): MapDef | undefined {
    return this.maps.get(id);
  }
  requireMap(id: string): MapDef {
    const v = this.maps.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: map "${id}" not found`);
    }
    return v;
  }
  listMaps(): MapDef[] {
    return [...this.maps.values()];
  }

  getNpc(id: string): Npc | undefined {
    return this.npcs.get(id);
  }
  requireNpc(id: string): Npc {
    const v = this.npcs.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: npc "${id}" not found`);
    }
    return v;
  }

  getDialogue(id: string): Dialogue | undefined {
    return this.dialogues.get(id);
  }
  requireDialogue(id: string): Dialogue {
    const v = this.dialogues.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: dialogue "${id}" not found`);
    }
    return v;
  }

  getQuest(id: string): Quest | undefined {
    return this.quests.get(id);
  }
  requireQuest(id: string): Quest {
    const v = this.quests.get(id);
    if (v === undefined) {
      throw new Error(`ContentRegistry: quest "${id}" not found`);
    }
    return v;
  }
  listQuests(): Quest[] {
    return [...this.quests.values()];
  }

  getBalance(): BalanceBundle {
    if (this.balance === null) {
      throw new Error('ContentRegistry: balance not loaded');
    }
    return this.balance;
  }
}
