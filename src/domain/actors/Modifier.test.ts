import { describe, expect, it } from 'vitest';

import { applyAllModifiers, applyModifier, summarizeModifiers, type Modifier } from './Modifier';

const baseStats = () => ({
  hp: 100,
  mp: 50,
  str: 10,
  vit: 10,
  agi: 10,
  dex: 10,
  int: 10,
  luk: 10,
});

describe('Modifier', () => {
  it('applies flat -> %add -> %mult in order', () => {
    const summary = summarizeModifiers(
      [
        { stat: 'str', kind: 'flat', value: 5, source: 'a' },
        { stat: 'str', kind: 'add', value: 0.2, source: 'b' },
        { stat: 'str', kind: 'mult', value: 0.5, source: 'c' },
      ],
      'str',
    );
    // base 10 + flat 5 = 15 ; * (1 + 0.2) = 18 ; * (1 + 0.5) = 27
    expect(applyModifier(10, summary)).toBeCloseTo(27, 5);
  });

  it('stacks adds additively and mults multiplicatively', () => {
    const summary = summarizeModifiers(
      [
        { stat: 'atk', kind: 'add', value: 0.1, source: 'a' } as unknown as Modifier,
        { stat: 'atk', kind: 'add', value: 0.2, source: 'b' } as unknown as Modifier,
        { stat: 'atk', kind: 'mult', value: 0.5, source: 'c' } as unknown as Modifier,
        { stat: 'atk', kind: 'mult', value: 1.0, source: 'd' } as unknown as Modifier,
      ],
      // We can apply on any stat key; the test is mathematical.
      'atk' as never,
    );
    // adds = 0.3 (additive), mult = (1.5 * 2.0) = 3.0 -> minus 1 = 2.0
    expect(summary.add).toBeCloseTo(0.3, 5);
    expect(summary.mult).toBeCloseTo(2.0, 5);
  });

  it('ignores modifiers for other stats', () => {
    const s = summarizeModifiers(
      [{ stat: 'agi', kind: 'flat', value: 99, source: 'noise' }],
      'str',
    );
    expect(s.flat).toBe(0);
  });

  it('applies modifiers to a full StatBlock', () => {
    const result = applyAllModifiers(baseStats(), [
      { stat: 'str', kind: 'flat', value: 5, source: 'gear' },
      { stat: 'vit', kind: 'mult', value: 0.5, source: 'buff' },
    ]);
    expect(result.str).toBe(15);
    expect(result.vit).toBe(15);
    // Untouched stats stay equal.
    expect(result.dex).toBe(10);
  });

  it('floors negative composite results at 0', () => {
    const s = summarizeModifiers(
      [{ stat: 'str', kind: 'flat', value: -100, source: 'curse' }],
      'str',
    );
    expect(applyModifier(10, s)).toBe(0);
  });
});
