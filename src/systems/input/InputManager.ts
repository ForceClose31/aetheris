/**
 * InputManager - maps physical inputs (keyboard, gamepad later) to abstract GameActions.
 *
 * The manager is engine-agnostic at the API level. The Phaser scene feeds it raw
 * KeyboardEvent codes, and rebinding is just a config swap.
 */

import { DEFAULT_KEYBINDINGS, type GameAction } from '@config/keybindings.config';

export interface InputSnapshot {
  readonly active: ReadonlySet<GameAction>;
  readonly justPressed: ReadonlySet<GameAction>;
  readonly justReleased: ReadonlySet<GameAction>;
}

export class InputManager {
  private bindings: Record<GameAction, Set<string>>;
  private actionFromCode = new Map<string, Set<GameAction>>();
  private active = new Set<GameAction>();
  private pressedThisFrame = new Set<GameAction>();
  private releasedThisFrame = new Set<GameAction>();

  constructor(initial: Record<GameAction, readonly string[]> = DEFAULT_KEYBINDINGS) {
    this.bindings = Object.fromEntries(
      (Object.entries(initial) as [GameAction, readonly string[]][]).map(([a, codes]) => [
        a,
        new Set(codes),
      ]),
    ) as Record<GameAction, Set<string>>;
    this.rebuildReverseMap();
  }

  private rebuildReverseMap(): void {
    this.actionFromCode.clear();
    for (const [action, codes] of Object.entries(this.bindings) as [
      GameAction,
      Set<string>,
    ][]) {
      for (const code of codes) {
        let set = this.actionFromCode.get(code);
        if (set === undefined) {
          set = new Set();
          this.actionFromCode.set(code, set);
        }
        set.add(action);
      }
    }
  }

  /** Rebind the given action to a new code list (replacing previous codes). */
  rebind(action: GameAction, codes: readonly string[]): void {
    this.bindings[action] = new Set(codes);
    this.rebuildReverseMap();
  }

  /** Feed a raw key-down event. Idempotent for held keys. */
  keyDown(code: string): void {
    const actions = this.actionFromCode.get(code);
    if (actions === undefined) {
      return;
    }
    for (const a of actions) {
      if (!this.active.has(a)) {
        this.active.add(a);
        this.pressedThisFrame.add(a);
      }
    }
  }

  /** Feed a raw key-up event. */
  keyUp(code: string): void {
    const actions = this.actionFromCode.get(code);
    if (actions === undefined) {
      return;
    }
    for (const a of actions) {
      if (this.active.has(a)) {
        this.active.delete(a);
        this.releasedThisFrame.add(a);
      }
    }
  }

  /** True while held. */
  isDown(action: GameAction): boolean {
    return this.active.has(action);
  }

  /** True only the first frame after press. Cleared by `endFrame()`. */
  wasPressed(action: GameAction): boolean {
    return this.pressedThisFrame.has(action);
  }

  /** True only the first frame after release. Cleared by `endFrame()`. */
  wasReleased(action: GameAction): boolean {
    return this.releasedThisFrame.has(action);
  }

  snapshot(): InputSnapshot {
    return {
      active: new Set(this.active),
      justPressed: new Set(this.pressedThisFrame),
      justReleased: new Set(this.releasedThisFrame),
    };
  }

  /** Call once per frame after consumers read the state. */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }

  /** Drop all input state (e.g. on focus loss). */
  reset(): void {
    this.active.clear();
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }
}
