import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AIService } from '../services/ai.service';
import { RefreshTokenModel } from '../models/RefreshToken';
import { pool } from '../config/database';

// BullMQ uses ioredis internally — support REDIS_URL or host:port
const redisUrl = process.env.REDIS_URL;
const connection = redisUrl
    ? { url: redisUrl }  // Cloud Redis (Upstash, etc.)
    : { host: config.redis.host, port: config.redis.port }; // Local Redis

// Queues
export const embeddingQueue = new Queue('embeddings', { connection });
export const cleanupQueue = new Queue('cleanup', { connection });

// Workers
let embeddingWorker: Worker | null = null;
let cleanupWorker: Worker | null = null;

export function initializeWorkers(): void {
    // Embedding generation worker
    embeddingWorker = new Worker(
        'embeddings',
        async (job: Job) => {
            const { productId } = job.data;
            logger.info(`Processing embedding for product ${productId}`);
            await AIService.generateProductEmbedding(productId);
        },
        {
            connection,
            concurrency: 2,
            limiter: { max: 5, duration: 1000 }, // Rate limit: 5 per second
        }
    );

    embeddingWorker.on('completed', (job) => {
        logger.debug(`Embedding job ${job.id} completed`);
    });

    embeddingWorker.on('failed', (job, err) => {
        logger.error(`Embedding job ${job?.id} failed`, err);
    });

    // Cleanup worker (expired tokens, etc.)
    cleanupWorker = new Worker(
        'cleanup',
        async (job: Job) => {
            switch (job.name) {
                case 'cleanExpiredTokens':
                    const count = await RefreshTokenModel.deleteExpired();
                    logger.info(`Cleaned up ${count} expired refresh tokens`);
                    break;
                case 'cleanExpiredPendingPayments':
                    const result = await pool.query(
                        `DELETE FROM pending_payments
                         WHERE status = 'pending' AND expires_at < NOW()
                         RETURNING id`
                    );
                    logger.info(`Cleaned up ${result.rowCount} expired pending payments`);
                    break;
            }
        },
        { connection }
    );

    // Schedule recurring cleanup every 6 hours
    cleanupQueue.add('cleanExpiredTokens', {}, {
        repeat: { every: 6 * 60 * 60 * 1000 },
    });

    // Schedule pending payment cleanup every 30 minutes
    cleanupQueue.add('cleanExpiredPendingPayments', {}, {
        repeat: { every: 30 * 60 * 1000 },
    });

    logger.info('Background job workers initialized');
}

// Helper to queue embedding generation
export async function queueEmbeddingGeneration(productId: number): Promise<void> {
    await embeddingQueue.add('generateEmbedding', { productId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
    });
}

export async function closeWorkers(): Promise<void> {
    if (embeddingWorker) await embeddingWorker.close();
    if (cleanupWorker) await cleanupWorker.close();
    await embeddingQueue.close();
    await cleanupQueue.close();
}
