/**
 * Default keybindings (placeholder). The InputManager (later phase) reads these and
 * persists user overrides into the save settings.
 */

export type GameAction =
  | 'move.up'
  | 'move.down'
  | 'move.left'
  | 'move.right'
  | 'attack.light'
  | 'attack.heavy'
  | 'dodge'
  | 'block'
  | 'interact'
  | 'menu'
  | 'map'
  | 'skill.1'
  | 'skill.2'
  | 'skill.3'
  | 'skill.4'
  | 'ultimate';

export const DEFAULT_KEYBINDINGS: Readonly<Record<GameAction, readonly string[]>> = {
  'move.up': ['ArrowUp', 'KeyW'],
  'move.down': ['ArrowDown', 'KeyS'],
  'move.left': ['ArrowLeft', 'KeyA'],
  'move.right': ['ArrowRight', 'KeyD'],
  'attack.light': ['KeyJ'],
  'attack.heavy': ['KeyK'],
  dodge: ['Space'],
  block: ['KeyL'],
  interact: ['KeyE', 'Enter'],
  menu: ['Escape'],
  map: ['KeyM'],
  'skill.1': ['Digit1'],
  'skill.2': ['Digit2'],
  'skill.3': ['Digit3'],
  'skill.4': ['Digit4'],
  ultimate: ['KeyR'],
};
