/**
 * Express Application Setup
 *
 * Separated from server.ts so that Supertest can import the app
 * without starting the HTTP server or WebSocket connections.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { pool } from './config/database';
import { getRedisClient } from './config/redis';
import { isPubSubActive } from './services/pubsub.service';
import { generalLimiter, authLimiter } from './middlewares/rateLimiter';
import { requestIdMiddleware } from './middlewares/requestId';
import { httpLogger } from './middlewares/httpLogger';
import { sanitizeMiddleware } from './middlewares/sanitize';
import { AppError } from './utils/errors';

// Import routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import aiRoutes from './routes/ai.routes';
import adminRoutes from './routes/admin.routes';
import reviewRoutes from './routes/review.routes';
import wishlistRoutes from './routes/wishlist.routes';
import couponRoutes from './routes/coupon.routes';
import stockAlertRoutes from './routes/stockAlert.routes';
import notificationRoutes from './routes/notification.routes';
import paymentRoutes from './routes/payment.routes';

const app: Express = express();

// ─── Security Middlewares ───────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com', 'https://js.stripe.com'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.unsplash.com'],
            connectSrc: ["'self'", 'ws:', 'wss:', 'https://api.razorpay.com', 'https://lumberjack.razorpay.com', 'https://api.stripe.com'],
            frameSrc: ["'self'", 'https://api.razorpay.com', 'https://js.stripe.com'],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: config.env === 'production' ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
const allowedOrigins = [
    config.frontend.url,
    'http://localhost:5173',
    'http://localhost:3000',
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
}));

// ─── Stripe Webhook (needs raw body BEFORE json parser) ───────────
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));

// ─── Request Processing ────────────────────────────────────────────
app.use(requestIdMiddleware);
app.use(httpLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeMiddleware);

// Only apply rate limiter in non-test environment
if (config.env !== 'test') {
    app.use(generalLimiter);
}

app.disable('x-powered-by');

// Routes
app.use('/api/auth', config.env !== 'test' ? authLimiter : ((_req: Request, _res: Response, next: NextFunction) => next()), authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/stock-alerts', stockAlertRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/health', async (req: Request, res: Response) => {
    try {
        await pool.query('SELECT 1');
        const redis = await getRedisClient();

        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: config.env,
            services: {
                database: 'connected',
                redis: redis ? 'connected' : 'disconnected (cache disabled)',
                pubsub: isPubSubActive() ? 'active' : 'inactive (using direct fallback)',
                websocket: 'active',
            },
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// Root route
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'SmartCart API',
        version: '1.0.0',
        description: 'AI-powered e-commerce platform',
        endpoints: {
            health: '/health',
            docs: '/api/docs',
            auth: '/api/auth',
            products: '/api/products',
            cart: '/api/cart',
            orders: '/api/orders',
            ai: '/api/ai',
            admin: '/api/admin',
            payments: '/api/payments',
        },
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        requestId: req.requestId,
    });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.requestId || 'unknown';
    logger.error(`[rid:${requestId}] Unhandled error`, err);

    if (err.message?.includes('not allowed by CORS')) {
        res.status(403).json({
            success: false,
            code: 'CORS_ERROR',
            message: 'Origin not allowed',
            requestId,
        });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            code: err.code,
            message: err.message,
            requestId,
            ...(err as any).errors && { errors: (err as any).errors },
        });
        return;
    }

    res.status(500).json({
        success: false,
        code: 'INTERNAL_ERROR',
        message: config.env === 'development' ? err.message : 'Internal server error',
        requestId,
    });
});

export default app;
