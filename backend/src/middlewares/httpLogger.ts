import morgan from 'morgan';
import { Request, Response } from 'express';

/**
 * HTTP Request Logger using Morgan
 *
 * Log format:
 *   [timestamp] [HTTP] <method> <url> <status> <response-time>ms - <content-length> | rid:<request-id>
 *
 * - Color-coded status: 2xx green, 3xx cyan, 4xx yellow, 5xx red
 * - Includes correlation/request ID for tracing
 * - Skips health check and docs routes to reduce noise
 */

// Custom tokens
morgan.token('request-id', (req: Request) => req.requestId || '-');
morgan.token('user-id', (req: Request) => (req as any).user?.id?.toString() || 'anon');

// Color helpers
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

function colorStatus(status: number): string {
    if (status >= 500) return red(String(status));
    if (status >= 400) return yellow(String(status));
    if (status >= 300) return cyan(String(status));
    return green(String(status));
}

function colorMethod(method: string): string {
    const padded = method.padEnd(7);
    switch (method) {
        case 'GET': return green(padded);
        case 'POST': return cyan(padded);
        case 'PUT': return yellow(padded);
        case 'PATCH': return yellow(padded);
        case 'DELETE': return red(padded);
        default: return padded;
    }
}

// Custom format function
const formatFn = (tokens: any, req: Request, res: Response): string | null => {
    const status = parseInt(tokens.status(req, res) || '0');
    const responseTime = tokens['response-time'](req, res);
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const contentLength = tokens.res(req, res, 'content-length') || '0';
    const requestId = tokens['request-id'](req, res);
    const userId = tokens['user-id'](req, res);

    const timestamp = new Date().toISOString();

    return [
        dim(`[${timestamp}]`),
        bold('[HTTP]'),
        colorMethod(method),
        url,
        colorStatus(status),
        dim(`${responseTime}ms`),
        dim(`- ${contentLength}b`),
        dim(`| rid:${requestId.substring(0, 8)}`),
        userId !== 'anon' ? dim(`uid:${userId}`) : '',
    ].filter(Boolean).join(' ');
};

export const httpLogger = morgan(formatFn as any, {
    // Skip noisy routes
    skip: (req: Request) => {
        const url = req.originalUrl || req.url;
        return url === '/health' || url.startsWith('/api/docs');
    },
});
