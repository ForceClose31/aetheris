import { describe, expect, it } from 'vitest';

import { CooldownTracker } from './CooldownTracker';

describe('CooldownTracker', () => {
  it('reports cooldown remaining and clears at 0', () => {
    const ct = new CooldownTracker();
    ct.startCooldown('skl.x', 1000);
    expect(ct.isOnCooldown('skl.x')).toBe(true);
    expect(ct.remaining('skl.x')).toBe(1000);
    ct.update(400);
    expect(ct.remaining('skl.x')).toBe(600);
    ct.update(700);
    expect(ct.isOnCooldown('skl.x')).toBe(false);
  });

  it('skips zero/negative durations', () => {
    const ct = new CooldownTracker();
    ct.startCooldown('skl.y', 0);
    expect(ct.isOnCooldown('skl.y')).toBe(false);
  });

  it('clear removes all entries', () => {
    const ct = new CooldownTracker();
    ct.startCooldown('a', 100);
    ct.startCooldown('b', 200);
    ct.clear();
    expect(ct.entries()).toHaveLength(0);
  });
});
