import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

export class CacheService {
    private static DEFAULT_TTL = 300; // 5 minutes

    static async get<T>(key: string): Promise<T | null> {
        try {
            const client = await getRedisClient();
            if (!client) return null;

            const data = await client.get(key);
            if (!data) return null;

            return JSON.parse(data) as T;
        } catch (error) {
            logger.debug('Cache get error', { key });
            return null;
        }
    }

    static async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
        try {
            const client = await getRedisClient();
            if (!client) return;

            await client.setEx(key, ttl, JSON.stringify(value));
        } catch (error) {
            logger.debug('Cache set error', { key });
        }
    }

    static async del(key: string): Promise<void> {
        try {
            const client = await getRedisClient();
            if (!client) return;

            await client.del(key);
        } catch (error) {
            logger.debug('Cache delete error', { key });
        }
    }

    static async invalidatePattern(pattern: string): Promise<void> {
        try {
            const client = await getRedisClient();
            if (!client) return;

            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
            }
        } catch (error) {
            logger.debug('Cache invalidate pattern error', { pattern });
        }
    }

    // Cache keys
    static productListKey(filters: string): string {
        return `products:list:${filters}`;
    }

    static productKey(id: number): string {
        return `products:${id}`;
    }

    static categoriesKey(): string {
        return 'products:categories';
    }

    static cartKey(userId: number): string {
        return `cart:${userId}`;
    }
}
