import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      _res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }
    // Replace with parsed (coerced + stripped) values
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
