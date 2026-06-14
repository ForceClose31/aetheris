/**
 * Game-wide configuration constants.
 *
 * These describe the engine/runtime contract; gameplay tuning lives in `balance.config.ts`
 * and content JSON. Anything that affects "how the game feels" should not live here.
 */

export const GAME_CONFIG = {
  title: 'Aetheris',
  version: '0.0.0',
  /** Native game resolution. The canvas scales up using FIT mode. */
  width: 480,
  height: 270,
  /** Maximum integer scale before non-integer scaling is allowed. */
  pixelArt: true,
  backgroundColor: '#0a0a0e',
  targetFps: 60,
  /** Real seconds per in-game hour. Mirrors GDD section 10. */
  secondsPerGameHour: 60,
} as const;

export type GameConfig = typeof GAME_CONFIG;
