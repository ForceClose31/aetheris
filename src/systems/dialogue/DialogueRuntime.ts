/**
 * DialogueRuntime - traverses a Dialogue node graph.
 *
 * Holds a cursor on the current node id. UI calls `advance()` for "say" nodes
 * and `choose(idx)` for "choice" nodes. Each transition processes flag effects.
 */

import type { Dialogue, DialogueNode } from '@data/schemas/dialogue.schema';
import type { WorldFlags } from '@systems/flags/WorldFlags';


export interface DialogueState {
  readonly nodeId: string;
  readonly node: DialogueNode;
  readonly done: boolean;
}

export interface DialogueEvent {
  readonly kind: 'flag_set';
  readonly flag: string;
  readonly value: boolean | number | string;
}

export class DialogueRuntime {
  private cursor: string;
  private done = false;
  private readonly events: DialogueEvent[] = [];

  constructor(private readonly dialogue: Dialogue, private readonly flags: WorldFlags) {
    this.cursor = dialogue.start;
    this.applyEnter(this.currentNode());
  }

  state(): DialogueState {
    return { nodeId: this.cursor, node: this.currentNode(), done: this.done };
  }

  consumeEvents(): DialogueEvent[] {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }

  /** Advance through a `say` node. Returns the new state. */
  advance(): DialogueState {
    if (this.done) {
      return this.state();
    }
    const node = this.currentNode();
    if (node.kind === 'say') {
      if (node.next === undefined) {
        this.done = true;
      } else {
        this.cursor = node.next;
        this.applyEnter(this.currentNode());
      }
    } else if (node.kind === 'end') {
      this.done = true;
    }
    return this.state();
  }

  /** Pick option at index for a `choice` node. */
  choose(index: number): DialogueState {
    if (this.done) {
      return this.state();
    }
    const node = this.currentNode();
    if (node.kind !== 'choice') {
      return this.state();
    }
    const opt = node.options[index];
    if (opt === undefined) {
      return this.state();
    }
    if (!this.flags.satisfiesAll(opt.requireFlags)) {
      return this.state();
    }
    this.cursor = opt.next;
    this.applyEnter(this.currentNode());
    return this.state();
  }

  /** Available options for the current choice node, filtered by their requireFlags. */
  availableOptions(): { index: number; label: { en: string } }[] {
    const node = this.currentNode();
    if (node.kind !== 'choice') {
      return [];
    }
    const out: { index: number; label: { en: string } }[] = [];
    for (let i = 0; i < node.options.length; i++) {
      const opt = node.options[i];
      if (opt === undefined) {
        continue;
      }
      if (this.flags.satisfiesAll(opt.requireFlags)) {
        out.push({ index: i, label: opt.label });
      }
    }
    return out;
  }

  private currentNode(): DialogueNode {
    const n = this.dialogue.nodes[this.cursor];
    if (n === undefined) {
      throw new Error(`DialogueRuntime: missing node "${this.cursor}" in "${this.dialogue.id}"`);
    }
    return n;
  }

  private applyEnter(node: DialogueNode): void {
    if ('setFlags' in node && Array.isArray(node.setFlags)) {
      for (const eff of node.setFlags) {
        this.flags.set(eff.flag, eff.set);
        this.events.push({ kind: 'flag_set', flag: eff.flag, value: eff.set });
      }
    }
    if (node.kind === 'end') {
      this.done = true;
    }
  }
}
