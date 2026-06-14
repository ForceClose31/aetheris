/**
 * Schema - Zod helpers for validation with file-context error reporting.
 */

import { err, ok, type Result } from './Result';

import type { ZodError, ZodIssue, ZodTypeAny, z } from 'zod';

export interface ValidationFailure {
  readonly source: string; // file path or virtual id
  readonly issues: readonly FormattedIssue[];
}

export interface FormattedIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export class ValidationError extends Error {
  constructor(public readonly failure: ValidationFailure) {
    super(
      `Validation failed for ${failure.source}:\n` +
        failure.issues.map((i) => `  - ${i.path}: ${i.message} (${i.code})`).join('\n'),
    );
    this.name = 'ValidationError';
  }
}

const formatIssue = (issue: ZodIssue): FormattedIssue => ({
  path: issue.path.length === 0 ? '<root>' : issue.path.join('.'),
  code: issue.code,
  message: issue.message,
});

const formatZodError = (e: ZodError, source: string): ValidationFailure => ({
  source,
  issues: e.issues.map(formatIssue),
});

/** Validate `input` against `schema`. Returns Result with rich source-tagged errors. */
export const validate = <S extends ZodTypeAny>(
  schema: S,
  input: unknown,
  source: string,
): Result<z.infer<S>, ValidationError> => {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return ok(parsed.data as z.infer<S>);
  }
  return err(new ValidationError(formatZodError(parsed.error, source)));
};

/** Like `validate` but throws on failure. Use only at boot or tests. */
export const validateOrThrow = <S extends ZodTypeAny>(
  schema: S,
  input: unknown,
  source: string,
): z.infer<S> => {
  const r = validate(schema, input, source);
  if (!r.ok) {
    throw r.error;
  }
  return r.value;
};
