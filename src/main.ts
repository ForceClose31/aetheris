/**
 * Aetheris - Phaser game bootstrap.
 *
 * Mounts the Phaser.Game into #game-root, registers Boot/Preload/Title scenes,
 * and lets BootScene wire up services and content.
 */

import { GAME_CONFIG } from '@config/game.config';
import { BootScene } from '@scenes/BootScene';
import { HudScene } from '@scenes/HudScene';
import { PreloadScene } from '@scenes/PreloadScene';
import { TitleScene } from '@scenes/TitleScene';
import { WorldScene } from '@scenes/WorldScene';
import Phaser from 'phaser';

const removeBootFallback = (): void => {
  const fallback = document.getElementById('boot-fallback');
  if (fallback !== null) {
    fallback.remove();
  }
};

const start = (): void => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: GAME_CONFIG.backgroundColor,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
    pixelArt: GAME_CONFIG.pixelArt,
    roundPixels: true,
    fps: { target: GAME_CONFIG.targetFps, forceSetTimeOut: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [BootScene, PreloadScene, TitleScene, WorldScene, HudScene],
  };

  // Phaser.Game registers itself in the parent DOM node; reference is intentional.
  new Phaser.Game(config);
  removeBootFallback();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
