import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const data = schema.parse(req[source]);
            // Express v5 makes req.query and req.params read-only,
            // so store validated data on req.validated instead
            if (source === 'query' || source === 'params') {
                if (!(req as any).validated) (req as any).validated = {};
                (req as any).validated[source] = data;
            } else {
                (req as any)[source] = data;
            }
            next();
        } catch (error: any) {
            if (error instanceof ZodError || error?.issues) {
                const issues = error.issues || [];
                const errors = issues.map((e: any) => ({
                    field: (e.path || []).join('.'),
                    message: e.message,
                }));

                res.status(422).json({
                    success: false,
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    errors,
                });
                return;
            }
            next(error);
        }
    };
}
