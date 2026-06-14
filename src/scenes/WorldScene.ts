/**
 * WorldScene - the gameplay scene. Phase 1 ships an Eldermill stub:
 *
 * - A solid-color floor with a tile grid.
 * - The player as a 2-color rectangle (placeholder sprite).
 * - 8-directional movement via InputManager.
 * - A "training dummy" rectangle that grants 25 EXP per `interact` press.
 *
 * Real maps land in Phase 3 (Tiled importer).
 */


import { GAME_CONFIG } from '@config/game.config';
import { getLogger } from '@core/Logger';
import { getRootLocator } from '@core/ServiceLocator';
import Phaser from 'phaser';


import type { InputManager } from '@systems/input/InputManager';

import type { Player } from '@domain/actors/Player';

import type { ContentRegistry } from '@data/registry/ContentRegistry';

import { TOKENS } from './BootScene';

const PLAYER_SIZE = 12;
const PLAYER_SPEED_BASE = 90; // px/sec at SPD = 60 baseline

export class WorldScene extends Phaser.Scene {
  private input_!: InputManager;
  private player!: Player;
  private registry_!: ContentRegistry;
  private playerSprite!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private dummy!: Phaser.GameObjects.Rectangle;
  private dummyLabel!: Phaser.GameObjects.Text;
  private interactPrompt!: Phaser.GameObjects.Text;
  private readonly log = getLogger('WorldScene');

  constructor() {
    super({ key: 'World' });
  }

  create(): void {
    const locator = getRootLocator();
    this.input_ = locator.get(TOKENS.InputManager);
    this.player = locator.get(TOKENS.Player);
    this.registry_ = locator.get(TOKENS.ContentRegistry);

    this.cameras.main.setBackgroundColor('#171720');
    this.drawTileGrid();

    const { width, height } = this.scale;
    this.playerBody = this.add
      .rectangle(width / 2, height / 2 + 2, PLAYER_SIZE, PLAYER_SIZE - 2, 0x6cc6ff)
      .setStrokeStyle(1, 0x1a1a22);
    this.playerSprite = this.add
      .rectangle(width / 2, height / 2 - PLAYER_SIZE / 2 + 1, PLAYER_SIZE - 2, 4, 0xe6e6ec)
      .setStrokeStyle(1, 0x1a1a22);

    this.dummy = this.add
      .rectangle(width * 0.75, height * 0.5, 14, 14, 0xa44a4a)
      .setStrokeStyle(1, 0x1a1a22);
    this.dummyLabel = this.add
      .text(this.dummy.x, this.dummy.y - 14, 'training dummy', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#aa8888',
      })
      .setOrigin(0.5);

    this.interactPrompt = this.add
      .text(width / 2, 8, 'WASD/Arrows: move    E/Enter: practice (+25 EXP)', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#5a5a66',
      })
      .setOrigin(0.5, 0);

    this.bindInput();
    this.scene.launch('Hud');
    this.log.info('WorldScene ready');
  }

  private drawTileGrid(): void {
    const { width, height } = this.scale;
    const g = this.add.graphics({ lineStyle: { width: 1, color: 0x222229, alpha: 0.5 } });
    const tile = 16;
    for (let x = 0; x <= width; x += tile) {
      g.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += tile) {
      g.lineBetween(0, y, width, y);
    }
  }

  private bindInput(): void {
    const im = this.input_;
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => im.keyDown(ev.code));
    this.input.keyboard?.on('keyup', (ev: KeyboardEvent) => im.keyUp(ev.code));
    this.game.events.on(Phaser.Core.Events.BLUR, () => im.reset());
  }

  override update(_time: number, delta: number): void {
    const im = this.input_;
    const dt = delta / 1000;

    let dx = 0;
    let dy = 0;
    if (im.isDown('move.left')) {
      dx -= 1;
    }
    if (im.isDown('move.right')) {
      dx += 1;
    }
    if (im.isDown('move.up')) {
      dy -= 1;
    }
    if (im.isDown('move.down')) {
      dy += 1;
    }
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      const derived = this.player.computeDerived();
      const speed = (PLAYER_SPEED_BASE * derived.spd) / 60;
      const moveX = dx * speed * dt;
      const moveY = dy * speed * dt;
      this.playerBody.x += moveX;
      this.playerBody.y += moveY;
      this.playerSprite.x += moveX;
      this.playerSprite.y += moveY;
      this.clampToScreen();
    }

    if (im.wasPressed('interact')) {
      this.tryInteract();
    }

    im.endFrame();
  }

  private clampToScreen(): void {
    const { width, height } = this.scale;
    const half = PLAYER_SIZE / 2;
    const clampedX = Phaser.Math.Clamp(this.playerBody.x, half, width - half);
    const clampedY = Phaser.Math.Clamp(this.playerBody.y, half, height - half);
    const dx = clampedX - this.playerBody.x;
    const dy = clampedY - this.playerBody.y;
    this.playerBody.x += dx;
    this.playerBody.y += dy;
    this.playerSprite.x += dx;
    this.playerSprite.y += dy;
  }

  private tryInteract(): void {
    const distance = Phaser.Math.Distance.Between(
      this.playerBody.x,
      this.playerBody.y,
      this.dummy.x,
      this.dummy.y,
    );
    if (distance > 18) {
      this.flashLabel(this.dummyLabel, 'too far', 0xaa8888);
      return;
    }
    const balance = this.registry_.getBalance();
    const result = this.player.awardExp(balance.expCurve, balance.statCurves, 25);
    if (result.leveledUp) {
      this.flashLabel(this.dummyLabel, `LEVEL ${result.state.level}!`, 0xffff80);
    } else {
      this.flashLabel(this.dummyLabel, '+25 EXP', 0xc0e6ff);
    }
  }

  private flashLabel(target: Phaser.GameObjects.Text, text: string, color: number): void {
    const original = target.text;
    const originalColor = target.style.color;
    target.setText(text);
    target.setColor(`#${color.toString(16).padStart(6, '0')}`);
    this.time.delayedCall(700, () => {
      target.setText(original);
      target.setColor(originalColor ?? '#aa8888');
    });
  }
}

void GAME_CONFIG;
