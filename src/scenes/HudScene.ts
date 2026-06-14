/**
 * HudScene - overlay rendered on top of WorldScene.
 *
 * Phase 3: adds map name, time-of-day clock, active quest summary.
 */


import { getRootLocator } from '@core/ServiceLocator';
import type { WorldClock } from '@core/Time';
import type { ContentRegistry } from '@data/registry/ContentRegistry';
import type { Player } from '@domain/actors/Player';
import type { Inventory } from '@domain/inventory/Inventory';
import type { CooldownTracker } from '@systems/combat/CooldownTracker';
import { expToNext } from '@systems/leveling/Leveling';
import type { QuestSystem } from '@systems/quest/QuestSystem';
import type { WorldState } from '@systems/world/WorldState';
import Phaser from 'phaser';

import { TOKENS } from './BootScene';

const BAR_W = 64;
const BAR_H = 4;
const PADDING = 4;
const SKILL_HOTBAR: { id: string; key: string }[] = [
  { id: 'skl.basic_slash', key: 'J' },
  { id: 'skl.firebolt', key: 'K' },
];

export class HudScene extends Phaser.Scene {
  private player!: Player;
  private registry_!: ContentRegistry;
  private inventory!: Inventory;
  private cooldowns!: CooldownTracker;
  private quests!: QuestSystem;
  private worldState!: WorldState;
  private clock!: WorldClock;

  private hpBar!: Phaser.GameObjects.Rectangle;
  private mpBar!: Phaser.GameObjects.Rectangle;
  private staBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private staText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private bagText!: Phaser.GameObjects.Text;
  private mapText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private skillChips: { label: Phaser.GameObjects.Text; cd: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super({ key: 'Hud' });
  }

  create(): void {
    const locator = getRootLocator();
    this.player = locator.get(TOKENS.Player);
    this.registry_ = locator.get(TOKENS.ContentRegistry);
    this.inventory = locator.get(TOKENS.Inventory);
    this.cooldowns = locator.get(TOKENS.CooldownTracker);
    this.quests = locator.get(TOKENS.QuestSystem);
    this.worldState = locator.get(TOKENS.WorldState);
    this.clock = locator.get(TOKENS.WorldClock);

    const x0 = PADDING;
    let y = PADDING;
    const labelStyle = {
      fontFamily: 'monospace',
      fontSize: '6px',
      color: '#e6e6ec',
    } satisfies Phaser.Types.GameObjects.Text.TextStyle;

    this.add.text(x0, y, 'HP', labelStyle);
    this.add.rectangle(x0 + 14, y + 3, BAR_W, BAR_H, 0x222229).setOrigin(0, 0.5);
    this.hpBar = this.add
      .rectangle(x0 + 14, y + 3, BAR_W, BAR_H, 0xc6403a)
      .setOrigin(0, 0.5);
    this.hpText = this.add
      .text(x0 + 14 + BAR_W + 4, y, '0/0', { ...labelStyle, color: '#9999a0' })
      .setOrigin(0, 0);

    y += 8;
    this.add.text(x0, y, 'MP', labelStyle);
    this.add.rectangle(x0 + 14, y + 3, BAR_W, BAR_H, 0x222229).setOrigin(0, 0.5);
    this.mpBar = this.add
      .rectangle(x0 + 14, y + 3, BAR_W, BAR_H, 0x4a7ec6)
      .setOrigin(0, 0.5);
    this.mpText = this.add
      .text(x0 + 14 + BAR_W + 4, y, '0/0', { ...labelStyle, color: '#9999a0' })
      .setOrigin(0, 0);

    y += 8;
    this.add.text(x0, y, 'ST', labelStyle);
    this.add.rectangle(x0 + 14, y + 3, BAR_W, BAR_H, 0x222229).setOrigin(0, 0.5);
    this.staBar = this.add
      .rectangle(x0 + 14, y + 3, BAR_W, BAR_H, 0x6acc7a)
      .setOrigin(0, 0.5);
    this.staText = this.add
      .text(x0 + 14 + BAR_W + 4, y, '0/0', { ...labelStyle, color: '#9999a0' })
      .setOrigin(0, 0);

    y += 10;
    this.mapText = this.add.text(x0, y, '', { ...labelStyle, color: '#aaaab0' });
    y += 8;
    this.questText = this.add.text(x0, y, '', { ...labelStyle, color: '#a0c0ff' });

    const { width, height } = this.scale;
    this.levelText = this.add
      .text(width - PADDING, PADDING, 'Lv 1', {
        ...labelStyle,
        fontSize: '8px',
      })
      .setOrigin(1, 0);
    this.expText = this.add
      .text(width - PADDING, PADDING + 10, 'EXP 0/0', {
        ...labelStyle,
        color: '#9999a0',
      })
      .setOrigin(1, 0);
    this.pointsText = this.add
      .text(width - PADDING, PADDING + 18, '', {
        ...labelStyle,
        color: '#ffd87a',
      })
      .setOrigin(1, 0);
    this.goldText = this.add
      .text(width - PADDING, PADDING + 26, 'g 0', {
        ...labelStyle,
        color: '#ffd87a',
      })
      .setOrigin(1, 0);
    this.bagText = this.add
      .text(width - PADDING, PADDING + 34, 'bag 0', {
        ...labelStyle,
        color: '#9999a0',
      })
      .setOrigin(1, 0);
    this.clockText = this.add
      .text(width - PADDING, PADDING + 42, '', {
        ...labelStyle,
        color: '#9999a0',
      })
      .setOrigin(1, 0);

    const baseX = PADDING;
    const baseY = height - PADDING - 14;
    for (let i = 0; i < SKILL_HOTBAR.length; i++) {
      const entry = SKILL_HOTBAR[i];
      if (entry === undefined) {
        continue;
      }
      const x = baseX + i * 50;
      const skill = this.registry_.getSkill(entry.id);
      const name = skill?.name.en ?? entry.id;
      const label = this.add.text(x, baseY, `[${entry.key}] ${name}`, {
        ...labelStyle,
        color: '#aaaab0',
      });
      const cd = this.add.text(x, baseY + 8, '', { ...labelStyle, color: '#aa6666' });
      this.skillChips.push({ label, cd });
    }

    this.refresh();
  }

  override update(): void {
    this.refresh();
  }

  private refresh(): void {
    const derived = this.player.computeDerived();
    const hp = this.player.getHp();
    const mp = this.player.getMp();
    const st = this.player.getStamina();
    const hpRatio = derived.hp === 0 ? 0 : hp / derived.hp;
    const mpRatio = derived.mp === 0 ? 0 : mp / derived.mp;
    const stRatio = derived.maxStamina === 0 ? 0 : st / derived.maxStamina;
    this.hpBar.width = Math.max(0, BAR_W * hpRatio);
    this.mpBar.width = Math.max(0, BAR_W * mpRatio);
    this.staBar.width = Math.max(0, BAR_W * stRatio);
    this.hpText.setText(`${Math.floor(hp)}/${derived.hp}`);
    this.mpText.setText(`${Math.floor(mp)}/${derived.mp}`);
    this.staText.setText(`${Math.floor(st)}/${derived.maxStamina}`);

    const level = this.player.getLevel();
    const exp = this.player.getExp();
    const balance = this.registry_.getBalance();
    const need = expToNext(balance.expCurve, level);
    const expDisplay = Number.isFinite(need) ? `EXP ${exp}/${need}` : 'EXP MAX';
    this.levelText.setText(`Lv ${level}`);
    this.expText.setText(expDisplay);

    const pts = this.player.getFreePoints();
    this.pointsText.setText(pts > 0 ? `+${pts} pts` : '');

    this.goldText.setText(`g ${this.inventory.getGold()}`);
    this.bagText.setText(`bag ${this.inventory.totalItems()}`);

    const now = this.clock.now();
    const hh = now.hour.toString().padStart(2, '0');
    const mm = now.minute.toString().padStart(2, '0');
    this.clockText.setText(`${hh}:${mm}  d${now.day}`);

    const map = this.registry_.getMap(this.worldState.getCurrentMapId());
    this.mapText.setText(map?.name.en ?? this.worldState.getCurrentMapId());

    const active = this.quests.activeQuests();
    if (active.length === 0) {
      this.questText.setText('');
    } else {
      const a = active[0];
      if (a !== undefined) {
        const obj = a.quest.objectives[0];
        const counter = a.progress.counters[0] ?? 0;
        if (obj !== undefined) {
          let target = 1;
          let label = '';
          if (obj.kind === 'kill') {
            target = obj.count;
            label = obj.description.en;
          } else if (obj.kind === 'collect') {
            target = obj.count;
            label = obj.description.en;
          } else {
            label = obj.description.en;
          }
          this.questText.setText(`${label} (${counter}/${target})`);
        }
      }
    }

    for (let i = 0; i < SKILL_HOTBAR.length; i++) {
      const entry = SKILL_HOTBAR[i];
      const chip = this.skillChips[i];
      if (entry === undefined || chip === undefined) {
        continue;
      }
      const remaining = this.cooldowns.remaining(entry.id);
      if (remaining > 0) {
        chip.cd.setText(`${(remaining / 1000).toFixed(1)}s`);
      } else {
        chip.cd.setText('');
      }
    }
  }
}
