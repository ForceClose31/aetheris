/**
 * DialogueScene - modal overlay rendered above WorldScene.
 *
 * On open, takes input focus from WorldScene by pausing its update loop. Closes
 * itself when the dialogue cursor reaches an `end` node, returning a flag to the
 * world (e.g. to open a shop or signal a quest event).
 */


import { getRootLocator } from '@core/ServiceLocator';
import type { ContentRegistry } from '@data/registry/ContentRegistry';
import { DialogueRuntime } from '@systems/dialogue/DialogueRuntime';
import type { WorldFlags } from '@systems/flags/WorldFlags';
import Phaser from 'phaser';



import { TOKENS } from './BootScene';

export interface DialogueSceneArgs {
  readonly dialogueId: string;
  readonly npcId?: string;
  readonly onClose?: (result: { flags: Record<string, boolean | number | string>; npcId?: string }) => void;
}

const PADDING = 8;
const BOX_HEIGHT = 76;

export class DialogueScene extends Phaser.Scene {
  private runtime!: DialogueRuntime;
  private body!: Phaser.GameObjects.Text;
  private speakerLabel!: Phaser.GameObjects.Text;
  private hintLabel!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private lineIdx = 0;
  private cooldownMs = 80;
  private args!: DialogueSceneArgs;
  private capturedFlags: Record<string, boolean | number | string> = {};

  constructor() {
    super({ key: 'Dialogue' });
  }

  init(args: DialogueSceneArgs): void {
    this.args = args;
  }

  create(): void {
    const locator = getRootLocator();
    const registry = locator.get(TOKENS.ContentRegistry) as ContentRegistry;
    const flags = locator.get(TOKENS.WorldFlags) as WorldFlags;

    const dialogue = registry.requireDialogue(this.args.dialogueId);
    this.runtime = new DialogueRuntime(dialogue, flags);
    this.lineIdx = 0;

    this.scene.pause('World');
    this.scene.bringToTop();

    const { width, height } = this.scale;
    const bg = this.add
      .rectangle(width / 2, height - PADDING - BOX_HEIGHT / 2, width - PADDING * 2, BOX_HEIGHT, 0x111118, 0.92)
      .setStrokeStyle(1, 0x444454);
    void bg;

    this.speakerLabel = this.add.text(PADDING + 6, height - PADDING - BOX_HEIGHT + 4, '', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#ffd87a',
    });
    this.body = this.add.text(
      PADDING + 6,
      height - PADDING - BOX_HEIGHT + 14,
      '',
      { fontFamily: 'monospace', fontSize: '7px', color: '#e6e6ec', wordWrap: { width: width - PADDING * 2 - 12 } },
    );
    this.hintLabel = this.add
      .text(width - PADDING - 6, height - PADDING - 6, '[E] continue', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#5a5a66',
      })
      .setOrigin(1, 1);

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => this.onKey(ev.code));
    this.refresh();
  }

  override update(_time: number, delta: number): void {
    if (this.cooldownMs > 0) {
      this.cooldownMs -= delta;
    }
  }

  private onKey(code: string): void {
    if (this.cooldownMs > 0) {
      return;
    }
    const state = this.runtime.state();
    if (state.done) {
      this.close();
      return;
    }
    if (state.node.kind === 'choice') {
      // Numeric keys select options 1..n.
      const digitMatch = /^Digit([1-9])$/.exec(code);
      if (digitMatch !== null && digitMatch[1] !== undefined) {
        const idx = parseInt(digitMatch[1], 10) - 1;
        const options = this.runtime.availableOptions();
        const opt = options[idx];
        if (opt !== undefined) {
          this.runtime.choose(opt.index);
          this.cooldownMs = 80;
          this.lineIdx = 0;
          this.consumeRuntimeEvents();
          this.refresh();
        }
      }
      return;
    }
    if (state.node.kind === 'say') {
      if (this.lineIdx + 1 < state.node.lines.length) {
        this.lineIdx += 1;
        this.refresh();
        return;
      }
      this.runtime.advance();
      this.lineIdx = 0;
      this.cooldownMs = 80;
      this.consumeRuntimeEvents();
      this.refresh();
      if (this.runtime.state().done) {
        this.close();
      }
      return;
    }
    if (state.node.kind === 'end') {
      this.close();
    }
  }

  private consumeRuntimeEvents(): void {
    for (const ev of this.runtime.consumeEvents()) {
      if (ev.kind === 'flag_set') {
        this.capturedFlags[ev.flag] = ev.value;
      }
    }
  }

  private refresh(): void {
    const state = this.runtime.state();
    const node = state.node;
    if (node.kind === 'say') {
      const speaker = node.speaker?.en ?? '';
      this.speakerLabel.setText(speaker);
      const line = node.lines[this.lineIdx]?.en ?? '';
      this.body.setText(line);
      this.clearOptions();
      const more = this.lineIdx + 1 < node.lines.length;
      this.hintLabel.setText(more ? '[E] more' : '[E] continue');
      return;
    }
    if (node.kind === 'choice') {
      const speaker = node.speaker?.en ?? '';
      this.speakerLabel.setText(speaker);
      this.body.setText(node.prompt.en);
      this.clearOptions();
      const options = this.runtime.availableOptions();
      const baseY = this.body.y + 24;
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt === undefined) {
          continue;
        }
        const t = this.add.text(
          this.body.x,
          baseY + i * 9,
          `${i + 1}. ${opt.label.en}`,
          { fontFamily: 'monospace', fontSize: '7px', color: '#a0c0ff' },
        );
        this.optionTexts.push(t);
      }
      this.hintLabel.setText('[1-9] select');
      return;
    }
    if (node.kind === 'end') {
      this.close();
    }
  }

  private clearOptions(): void {
    for (const t of this.optionTexts) {
      t.destroy();
    }
    this.optionTexts.length = 0;
  }

  private close(): void {
    this.scene.resume('World');
    this.args.onClose?.({ flags: this.capturedFlags, npcId: this.args.npcId });
    this.scene.stop();
  }
}
