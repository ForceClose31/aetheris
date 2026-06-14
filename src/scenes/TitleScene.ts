/**
 * TitleScene - placeholder splash. Phase 0 ends here.
 */

import { GAME_CONFIG } from '@config/game.config';
import Phaser from 'phaser';


export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Title' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(GAME_CONFIG.backgroundColor);

    this.add
      .text(width / 2, height / 2 - 30, 'AETHERIS', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#e6e6ec',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 0, 'Phase 0 Foundations', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#7a7a86',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 16, `v${GAME_CONFIG.version}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#5a5a66',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 12, 'press any key', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#5a5a66',
      })
      .setOrigin(0.5);

    const advance = (): void => {
      this.scene.start('World');
    };
    this.input.keyboard?.once('keydown', advance);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, advance);
  }
}
