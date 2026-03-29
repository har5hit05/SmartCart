import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attaches a unique correlation/request ID to every incoming request.
 * - If the client sends an `X-Request-ID` header, it is reused (useful for distributed tracing).
 * - Otherwise a new UUID v4 is generated.
 * - The ID is set on `req.requestId` and echoed back in the `X-Request-ID` response header.
 */

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            requestId: string;
        }
    }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const id = (req.headers['x-request-id'] as string) || uuidv4();
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
}
