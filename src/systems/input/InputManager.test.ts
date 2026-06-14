import { describe, expect, it } from 'vitest';

import { InputManager } from './InputManager';

describe('InputManager', () => {
  it('maps key codes to actions per default keybindings', () => {
    const im = new InputManager();
    im.keyDown('KeyW');
    expect(im.isDown('move.up')).toBe(true);
    expect(im.wasPressed('move.up')).toBe(true);
    im.endFrame();
    expect(im.wasPressed('move.up')).toBe(false);
    im.keyUp('KeyW');
    expect(im.isDown('move.up')).toBe(false);
    expect(im.wasReleased('move.up')).toBe(true);
  });

  it('supports multiple physical keys per action', () => {
    const im = new InputManager();
    im.keyDown('ArrowUp');
    expect(im.isDown('move.up')).toBe(true);
  });

  it('rebinds an action atomically', () => {
    const im = new InputManager();
    im.rebind('attack.light', ['KeyZ']);
    im.keyDown('KeyJ');
    expect(im.isDown('attack.light')).toBe(false);
    im.keyDown('KeyZ');
    expect(im.isDown('attack.light')).toBe(true);
  });

  it('reset() clears all input state', () => {
    const im = new InputManager();
    im.keyDown('KeyW');
    im.reset();
    expect(im.isDown('move.up')).toBe(false);
  });

  it('snapshot returns disjoint sets', () => {
    const im = new InputManager();
    im.keyDown('KeyW');
    const snap = im.snapshot();
    expect(snap.active.has('move.up')).toBe(true);
    expect(snap.justPressed.has('move.up')).toBe(true);
    expect(snap.justReleased.size).toBe(0);
  });
});
