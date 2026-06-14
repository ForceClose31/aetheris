import type { Dialogue } from '@data/schemas/dialogue.schema';
import { WorldFlags } from '@systems/flags/WorldFlags';
import { describe, expect, it } from 'vitest';


import { DialogueRuntime } from './DialogueRuntime';

const dialogue: Dialogue = {
  id: 'dlg.test',
  start: 'a',
  nodes: {
    a: {
      kind: 'say',
      lines: [{ en: 'hello' }, { en: 'how are you' }],
      next: 'menu',
      requireFlags: [],
      setFlags: [{ flag: 'met', set: true }],
    },
    menu: {
      kind: 'choice',
      prompt: { en: 'pick' },
      options: [
        { label: { en: 'one' }, next: 'one', requireFlags: [] },
        { label: { en: 'gated' }, next: 'gated', requireFlags: [{ flag: 'pass', equals: true }] },
      ],
      requireFlags: [],
      setFlags: [],
    },
    one: { kind: 'end', setFlags: [{ flag: 'chose', set: 'one' }] },
    gated: { kind: 'end', setFlags: [{ flag: 'chose', set: 'gated' }] },
  },
};

describe('DialogueRuntime', () => {
  it('walks say nodes line by line then advances next', () => {
    const flags = new WorldFlags();
    const r = new DialogueRuntime(dialogue, flags);
    expect(r.state().nodeId).toBe('a');
    expect(flags.get('met')).toBe(true);
    r.advance();
    expect(r.state().nodeId).toBe('menu');
  });

  it('filters choice options by requireFlags', () => {
    const flags = new WorldFlags();
    const r = new DialogueRuntime(dialogue, flags);
    r.advance(); // -> menu
    expect(r.availableOptions()).toHaveLength(1);
    flags.set('pass', true);
    expect(r.availableOptions()).toHaveLength(2);
  });

  it('choose() applies setFlags and ends dialogue at end node', () => {
    const flags = new WorldFlags();
    flags.set('pass', true);
    const r = new DialogueRuntime(dialogue, flags);
    r.advance(); // -> menu
    r.choose(1); // -> gated
    expect(flags.get('chose')).toBe('gated');
    expect(r.state().done).toBe(true);
  });

  it('consumeEvents exposes flag_set events and clears them', () => {
    const flags = new WorldFlags();
    const r = new DialogueRuntime(dialogue, flags);
    const events = r.consumeEvents();
    expect(events.some((e) => e.flag === 'met' && e.value === true)).toBe(true);
    expect(r.consumeEvents()).toEqual([]);
  });
});
