/**
 * HudScene - overlay rendered on top of WorldScene.
 *
 * Shows HP/MP/Stamina bars, level, EXP progress, and free points (when > 0).
 */

import { getRootLocator } from '@core/ServiceLocator';
import { expToNext } from '@systems/leveling/Leveling';
import Phaser from 'phaser';

import type { Player } from '@domain/actors/Player';

import type { ContentRegistry } from '@data/registry/ContentRegistry';



import { TOKENS } from './BootScene';

const BAR_W = 64;
const BAR_H = 4;
const PADDING = 4;

export class HudScene extends Phaser.Scene {
  private player!: Player;
  private registry_!: ContentRegistry;

  private hpBar!: Phaser.GameObjects.Rectangle;
  private mpBar!: Phaser.GameObjects.Rectangle;
  private staBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private staText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Hud' });
  }

  create(): void {
    const locator = getRootLocator();
    this.player = locator.get(TOKENS.Player);
    this.registry_ = locator.get(TOKENS.ContentRegistry);

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

    const { width } = this.scale;
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
  }
}
