import { describe, expect, it } from 'vitest';

import { createToken, ServiceLocator } from './ServiceLocator';

describe('ServiceLocator', () => {
  it('registers and retrieves typed services', () => {
    const Locator = new ServiceLocator();
    const Tok = createToken<{ greet(): string }>('Greeter');
    Locator.register(Tok, { greet: () => 'hi' });
    expect(Locator.get(Tok).greet()).toBe('hi');
  });

  it('throws on duplicate register', () => {
    const Locator = new ServiceLocator();
    const Tok = createToken<number>('N');
    Locator.register(Tok, 1);
    expect(() => Locator.register(Tok, 2)).toThrow();
  });

  it('throws on missing get', () => {
    const Locator = new ServiceLocator();
    const Tok = createToken<number>('Missing');
    expect(() => Locator.get(Tok)).toThrow();
  });

  it('replace() overwrites', () => {
    const Locator = new ServiceLocator();
    const Tok = createToken<number>('Replaceable');
    Locator.register(Tok, 1);
    Locator.replace(Tok, 2);
    expect(Locator.get(Tok)).toBe(2);
  });
});
