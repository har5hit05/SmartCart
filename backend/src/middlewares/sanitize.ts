import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

/**
 * XSS Sanitization Middleware
 *
 * Recursively sanitizes all string values in req.body, req.query, and req.params
 * to prevent Cross-Site Scripting (XSS) attacks.
 *
 * Examples:
 *   "<script>alert('xss')</script>"  →  "&lt;script&gt;alert('xss')&lt;/script&gt;"
 *   "<img onerror=alert(1)>"         →  "&lt;img onerror=alert(1)&gt;"
 *   "Normal text"                    →  "Normal text"  (unchanged)
 */

// Configure xss with strict options
const xssOptions: XSS.IFilterXSSOptions = {
    whiteList: {},          // No HTML tags allowed at all
    stripIgnoreTag: true,   // Strip tags not in whitelist
    stripIgnoreTagBody: ['script', 'style'], // Remove script/style tag contents entirely
};

function sanitizeValue(value: any): any {
    if (typeof value === 'string') {
        return xss(value, xssOptions);
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        return sanitizeObject(value);
    }
    return value;
}

function sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
        sanitized[key] = sanitizeValue(obj[key]);
    }
    return sanitized;
}

/**
 * Express middleware that sanitizes request body, query, and params.
 * Apply AFTER body parsers (express.json / express.urlencoded).
 */
export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
    try {
        // Sanitize body (POST/PUT data)
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitize query params  (GET ?foo=<script>)
        // Express v5 makes req.query read-only, so we sanitize into a new object
        if (req.query && typeof req.query === 'object') {
            const sanitizedQuery = sanitizeObject(req.query as Record<string, any>);
            // Attach sanitized values as a parallel property
            (req as any).sanitizedQuery = sanitizedQuery;
        }

        // Sanitize route params
        if (req.params && typeof req.params === 'object') {
            for (const key of Object.keys(req.params)) {
                if (typeof req.params[key] === 'string') {
                    (req.params as any)[key] = xss(req.params[key], xssOptions);
                }
            }
        }

        next();
    } catch (error) {
        // Never block a request due to sanitization failure
        next();
    }
}
