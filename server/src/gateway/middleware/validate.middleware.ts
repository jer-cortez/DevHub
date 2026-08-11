import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

/**
 * Parses `source` against `schema` and, on success, overwrites it on `req`
 * with the parsed value — zod strips unknown keys by default, so this is
 * what turns off mass assignment for every route it's applied to, not just
 * what rejects malformed input.
 */
function validate(
  schema: ZodType,
  source: 'body' | 'params'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    req[source] = result.data as any;
    next();
  };
}

export const validateBody = (schema: ZodType) => validate(schema, 'body');
export const validateParams = (schema: ZodType) => validate(schema, 'params');
