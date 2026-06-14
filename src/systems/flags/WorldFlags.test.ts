import { describe, expect, it } from 'vitest';

import { WorldFlags } from './WorldFlags';

describe('WorldFlags', () => {
  it('sets, gets, has, and deletes flags', () => {
    const f = new WorldFlags();
    expect(f.has('q.x')).toBe(false);
    f.set('q.x', true);
    expect(f.get('q.x')).toBe(true);
    f.set('q.x', 'started');
    expect(f.get('q.x')).toBe('started');
    f.delete('q.x');
    expect(f.has('q.x')).toBe(false);
  });

  it('satisfies and satisfiesAll', () => {
    const f = new WorldFlags();
    f.set('a', true);
    f.set('b', 5);
    expect(f.satisfies({ flag: 'a', equals: true })).toBe(true);
    expect(f.satisfies({ flag: 'b', equals: 5 })).toBe(true);
    expect(f.satisfies({ flag: 'b', equals: 6 })).toBe(false);
    expect(
      f.satisfiesAll([
        { flag: 'a', equals: true },
        { flag: 'b', equals: 5 },
      ]),
    ).toBe(true);
  });

  it('serialize and load round-trip', () => {
    const f = new WorldFlags();
    f.set('a', true);
    f.set('b', 'x');
    const snap = f.serialize();
    const f2 = new WorldFlags();
    f2.load(snap);
    expect(f2.get('a')).toBe(true);
    expect(f2.get('b')).toBe('x');
  });
});
