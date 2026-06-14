/**
 * PreloadScene - placeholder for atlas/audio preload.
 *
 * Phase 0 has no assets yet; the scene draws a faux progress bar and advances.
 */

import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const barW = Math.floor(width * 0.4);
    const barH = 6;

    this.add
      .text(cx, cy - 18, 'AETHERIS', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e6e6ec',
      })
      .setOrigin(0.5);

    const bg = this.add.rectangle(cx, cy + 4, barW, barH, 0x222229).setStrokeStyle(1, 0x444454);
    const fill = this.add
      .rectangle(bg.x - barW / 2, cy + 4, 1, barH - 2, 0x6cc6ff)
      .setOrigin(0, 0.5);

    let progress = 0;
    const tween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 600,
      ease: 'Linear',
      onUpdate: (_t, target) => {
        progress = (target as { value: number }).value;
        fill.width = Math.max(1, Math.floor((barW - 2) * progress));
      },
      onComplete: () => {
        this.scene.start('Title');
      },
    });
    void tween;
  }
}
