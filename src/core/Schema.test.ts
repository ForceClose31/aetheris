import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validate, ValidationError, validateOrThrow } from './Schema';

describe('Schema.validate', () => {
  const schema = z.object({ id: z.string(), level: z.number().int().min(1) });

  it('returns ok with parsed data on success', () => {
    const r = validate(schema, { id: 'abc', level: 3 }, 'inline:test');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ id: 'abc', level: 3 });
    }
  });

  it('returns err with source-tagged ValidationError on failure', () => {
    const r = validate(schema, { id: 'abc', level: 0 }, 'inline:test');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ValidationError);
      expect(r.error.failure.source).toBe('inline:test');
      expect(r.error.failure.issues.length).toBeGreaterThan(0);
      expect(r.error.failure.issues[0]?.path).toBe('level');
    }
  });

  it('validateOrThrow throws on failure', () => {
    expect(() => validateOrThrow(schema, { id: 'abc' }, 'inline:test')).toThrow(
      ValidationError,
    );
  });
});
