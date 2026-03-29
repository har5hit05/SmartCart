import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 1000 : 100,
    message: {
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 200 : 20,
    message: {
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many authentication attempts, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isDev ? 100 : 10,
    message: {
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many AI requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
