/**
 * Equipment - which item occupies which equip slot, and the modifiers it grants.
 *
 * On equip, the player gains modifiers tagged `equip:<slot>` so they can be
 * removed atomically on unequip.
 */

import type { Item, Slot } from '@data/schemas/item.schema';
import type { Modifier } from '@domain/actors/Modifier';
import type { Player } from '@domain/actors/Player';
import type { StatKey } from '@domain/actors/StatBlock';


const EQUIP_SLOTS = [
  'main',
  'off',
  'helm',
  'chest',
  'legs',
  'boots',
  'gloves',
  'cape',
  'ring',
  'amulet',
  'relic',
  'artifact',
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export const isEquipSlot = (slot: Slot): slot is EquipSlot =>
  (EQUIP_SLOTS as readonly Slot[]).includes(slot);

const STAT_KEYS: readonly StatKey[] = [
  'hp',
  'mp',
  'str',
  'vit',
  'agi',
  'dex',
  'int',
  'luk',
];

const buildModifiers = (item: Item, slot: EquipSlot): Modifier[] => {
  if (item.stats === undefined) {
    return [];
  }
  const source = `equip:${slot}:${item.id}`;
  const mods: Modifier[] = [];
  for (const k of STAT_KEYS) {
    const v = item.stats[k];
    if (v === undefined || v === 0) {
      continue;
    }
    mods.push({ stat: k, kind: 'flat', value: v, source });
  }
  return mods;
};

export class Equipment {
  private readonly slots = new Map<EquipSlot, Item>();

  constructor(private readonly player: Player) {}

  get(slot: EquipSlot): Item | undefined {
    return this.slots.get(slot);
  }

  /** Returns the previously equipped item, if any (for inventory return). */
  equip(slot: EquipSlot, item: Item): Item | null {
    if (item.slot !== slot) {
      throw new Error(`Equipment.equip: item slot ${item.slot} != target ${slot}`);
    }
    const previous = this.slots.get(slot) ?? null;
    if (previous !== null) {
      this.player.removeModifiersBySource(`equip:${slot}:${previous.id}`);
    }
    this.slots.set(slot, item);
    for (const mod of buildModifiers(item, slot)) {
      this.player.addModifier(mod);
    }
    return previous;
  }

  unequip(slot: EquipSlot): Item | null {
    const current = this.slots.get(slot) ?? null;
    if (current === null) {
      return null;
    }
    this.player.removeModifiersBySource(`equip:${slot}:${current.id}`);
    this.slots.delete(slot);
    return current;
  }

  list(): readonly { slot: EquipSlot; item: Item }[] {
    return [...this.slots.entries()].map(([slot, item]) => ({ slot, item }));
  }
}
