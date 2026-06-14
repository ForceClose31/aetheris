import { describe, expect, it } from 'vitest';

import { andThen, err, isErr, isOk, map, mapErr, ok, unwrap, unwrapOr } from './Result';

describe('Result', () => {
  it('isOk / isErr discriminate correctly', () => {
    const a = ok(1);
    const b = err(new Error('x'));
    expect(isOk(a)).toBe(true);
    expect(isErr(a)).toBe(false);
    expect(isOk(b)).toBe(false);
    expect(isErr(b)).toBe(true);
  });

  it('map transforms only Ok', () => {
    expect(map(ok(2), (n) => n + 3)).toEqual(ok(5));
    const e = err(new Error('x'));
    expect(map(e, (n: number) => n + 1)).toBe(e);
  });

  it('mapErr transforms only Err', () => {
    expect(mapErr(ok(1), () => 'never')).toEqual(ok(1));
    const r = mapErr(err(new Error('x')), (e) => e.message);
    expect(r).toEqual(err('x'));
  });

  it('andThen chains successes and short-circuits failures', () => {
    const r = andThen(ok(2), (n) => ok(n * 5));
    expect(r).toEqual(ok(10));
    const r2 = andThen(err<string>('bad'), (n: number) => ok(n + 1));
    expect(r2).toEqual(err('bad'));
  });

  it('unwrapOr returns fallback on Err', () => {
    expect(unwrapOr(ok(1), 99)).toBe(1);
    expect(unwrapOr(err('x'), 99)).toBe(99);
  });

  it('unwrap throws on Err and returns value on Ok', () => {
    expect(unwrap(ok(7))).toBe(7);
    expect(() => unwrap(err(new Error('boom')))).toThrow('boom');
  });
});
