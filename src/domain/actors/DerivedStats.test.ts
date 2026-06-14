import { describe, expect, it } from 'vitest';

import { computeDerivedStats, DEFAULT_DERIVED_CONFIG } from './DerivedStats';

const baseStats = (overrides: Partial<Record<string, number>> = {}) => ({
  hp: 50,
  mp: 20,
  str: 5,
  vit: 5,
  agi: 5,
  dex: 5,
  int: 5,
  luk: 5,
  ...overrides,
});

describe('DerivedStats', () => {
  it('computes ATK from STR and MATK from INT', () => {
    const d = computeDerivedStats(baseStats({ str: 10, int: 8 }));
    expect(d.atk).toBe(20);
    expect(d.matk).toBe(16);
  });

  it('clamps critPct between 0 and 100', () => {
    const high = computeDerivedStats(baseStats({ luk: 10000 }));
    expect(high.critPct).toBe(100);
    const low = computeDerivedStats(baseStats({ luk: 0 }), {
      ...DEFAULT_DERIVED_CONFIG,
      critBase: -50,
    });
    expect(low.critPct).toBe(0);
  });

  it('uses linear AGI scaling for SPD and EVA', () => {
    const a = computeDerivedStats(baseStats({ agi: 10 }));
    const b = computeDerivedStats(baseStats({ agi: 20 }));
    expect(b.spd - a.spd).toBe(10);
    expect(b.eva - a.eva).toBe(5);
  });
});
