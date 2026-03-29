import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        user: process.env.DATABASE_USER || 'smartcart_user',
        password: process.env.DATABASE_PASSWORD || 'smartcart_password',
        name: process.env.DATABASE_NAME || 'smartcart_db',
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-key',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    queue: {
        provider: process.env.QUEUE_PROVIDER || 'bullmq',
    },

    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
    },

    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || '',
        keySecret: process.env.RAZORPAY_KEY_SECRET || '',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },

    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },

    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
};