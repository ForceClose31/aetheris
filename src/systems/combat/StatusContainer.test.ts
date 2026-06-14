import { describe, expect, it } from 'vitest';

import type { StatusEffect } from '@data/schemas/status_effect.schema';

import { StatusContainer } from './StatusContainer';

const burn: StatusEffect = {
  id: 'stx.burn',
  name: { en: 'Burn' },
  tag: 'burn',
  durationMs: 3000,
  stacking: 'refresh',
  maxStacks: 1,
  body: {
    kind: 'dot',
    element: 'fire',
    base: 4,
    coef: 0,
    tickIntervalMs: 1000,
  },
};

const bleed: StatusEffect = {
  id: 'stx.bleed',
  name: { en: 'Bleed' },
  tag: 'bleed',
  durationMs: 3000,
  stacking: 'stack',
  maxStacks: 3,
  body: {
    kind: 'dot',
    element: 'phys',
    base: 1,
    coef: 0,
    tickIntervalMs: 1000,
  },
};

const stun: StatusEffect = {
  id: 'stx.stun',
  name: { en: 'Stun' },
  tag: 'stun',
  durationMs: 1000,
  stacking: 'refresh',
  maxStacks: 1,
  body: { kind: 'control', blocks: ['act', 'cast', 'move'] },
};

describe('StatusContainer', () => {
  it('emits a DOT event each tick interval', () => {
    const c = new StatusContainer();
    c.apply(burn, 'caster', 0);
    let total = 0;
    for (let i = 0; i < 3; i++) {
      const evs = c.update(1000);
      for (const ev of evs) {
        total += ev.damage;
      }
    }
    expect(total).toBe(12); // 4 dmg * 3 ticks
  });

  it('refresh stacking resets duration without stacking', () => {
    const c = new StatusContainer();
    c.apply(burn, 's', 0);
    c.update(2500);
    c.apply(burn, 's', 0); // refresh -> remaining back to 3000
    c.update(2500);
    expect(c.has('stx.burn')).toBe(true);
  });

  it('stack stacking multiplies damage up to maxStacks', () => {
    const c = new StatusContainer();
    c.apply(bleed, 's', 0);
    c.apply(bleed, 's', 0);
    c.apply(bleed, 's', 0);
    c.apply(bleed, 's', 0); // capped at 3 stacks
    const evs = c.update(1000);
    expect(evs[0]?.damage).toBe(3); // 1 base * 3 stacks
  });

  it('control effects expose action blocks', () => {
    const c = new StatusContainer();
    c.apply(stun, 's', 0);
    expect(c.controlBlocks()).toEqual({ act: true, cast: true, move: true });
    c.update(1100);
    expect(c.has('stx.stun')).toBe(false);
  });

  it('removeBySource removes only matching effects', () => {
    const c = new StatusContainer();
    c.apply(burn, 'A', 0);
    c.apply(bleed, 'B', 0);
    expect(c.removeBySource('A')).toBe(1);
    expect(c.has('stx.burn')).toBe(false);
    expect(c.has('stx.bleed')).toBe(true);
  });

  it('expires effects when remainingMs reaches 0', () => {
    const c = new StatusContainer();
    c.apply(burn, 's', 0);
    c.update(burn.durationMs + 10);
    expect(c.has('stx.burn')).toBe(false);
  });
});
