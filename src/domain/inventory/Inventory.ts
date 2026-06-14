/**
 * Inventory - simple slot-less stack-based bag.
 *
 * The container tracks gold separately, and items by id. Stackable items merge;
 * non-stackable items occupy independent counts of 1.
 */

import type { Item } from '@data/schemas/item.schema';

export interface InventoryEntry {
  readonly itemId: string;
  count: number;
}

export class Inventory {
  private gold = 0;
  /** Stackable items: itemId -> count. */
  private readonly stacks = new Map<string, number>();
  /** Non-stackable item ids that occupy 1 slot each (allowing duplicates). */
  private readonly uniques: string[] = [];

  getGold(): number {
    return this.gold;
  }

  addGold(amount: number): number {
    if (amount <= 0) {
      return this.gold;
    }
    this.gold += Math.floor(amount);
    return this.gold;
  }

  spendGold(amount: number): boolean {
    if (amount <= 0 || amount > this.gold) {
      return false;
    }
    this.gold -= Math.floor(amount);
    return true;
  }

  add(item: Item, qty: number): number {
    if (qty <= 0) {
      return 0;
    }
    if (item.stackable) {
      const current = this.stacks.get(item.id) ?? 0;
      const next = Math.min(item.maxStack, current + qty);
      this.stacks.set(item.id, next);
      return next - current;
    }
    let added = 0;
    for (let i = 0; i < qty; i++) {
      this.uniques.push(item.id);
      added++;
    }
    return added;
  }

  remove(itemId: string, qty: number): number {
    if (qty <= 0) {
      return 0;
    }
    if (this.stacks.has(itemId)) {
      const current = this.stacks.get(itemId) ?? 0;
      const remove = Math.min(current, qty);
      const remaining = current - remove;
      if (remaining <= 0) {
        this.stacks.delete(itemId);
      } else {
        this.stacks.set(itemId, remaining);
      }
      return remove;
    }
    let removed = 0;
    for (let i = this.uniques.length - 1; i >= 0 && removed < qty; i--) {
      if (this.uniques[i] === itemId) {
        this.uniques.splice(i, 1);
        removed++;
      }
    }
    return removed;
  }

  count(itemId: string): number {
    if (this.stacks.has(itemId)) {
      return this.stacks.get(itemId) ?? 0;
    }
    return this.uniques.filter((id) => id === itemId).length;
  }

  totalItems(): number {
    let total = 0;
    for (const c of this.stacks.values()) {
      total += c;
    }
    total += this.uniques.length;
    return total;
  }

  entries(): InventoryEntry[] {
    const map = new Map<string, number>();
    for (const [id, c] of this.stacks) {
      map.set(id, c);
    }
    for (const id of this.uniques) {
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return [...map.entries()].map(([itemId, count]) => ({ itemId, count }));
  }
}
