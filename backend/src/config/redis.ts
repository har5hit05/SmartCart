import { createClient, RedisClientType } from 'redis';
import { config } from './index';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;
let isConnected = false;

export async function getRedisClient(): Promise<RedisClientType | null> {
    if (redisClient && isConnected) return redisClient;

    try {
        // Support REDIS_URL (used by Upstash, Render, Railway, etc.) or fallback to host:port
        const redisUrl = process.env.REDIS_URL;

        if (redisUrl) {
            // Cloud Redis (Upstash, etc.) — URL includes TLS
            redisClient = createClient({
                url: redisUrl,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            logger.warn('Redis: Max reconnection attempts reached, running without cache');
                            return false;
                        }
                        return Math.min(retries * 200, 3000);
                    },
                },
            });
        } else {
            // Local Redis (Docker)
            redisClient = createClient({
                socket: {
                    host: config.redis.host,
                    port: config.redis.port,
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            logger.warn('Redis: Max reconnection attempts reached, running without cache');
                            return false;
                        }
                        return Math.min(retries * 200, 3000);
                    },
                },
            });
        }

        redisClient.on('error', (err) => {
            logger.warn('Redis connection error (cache disabled)', err.message);
            isConnected = false;
        });

        redisClient.on('connect', () => {
            logger.info('Redis connected');
            isConnected = true;
        });

        redisClient.on('end', () => {
            isConnected = false;
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        logger.warn('Redis unavailable, running without cache');
        redisClient = null;
        isConnected = false;
        return null;
    }
}

export async function closeRedis(): Promise<void> {
    if (redisClient && isConnected) {
        await redisClient.quit();
        logger.info('Redis connection closed');
    }
}
