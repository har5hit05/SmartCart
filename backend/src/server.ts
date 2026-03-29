import { createServer } from 'http';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { pool, closeDatabase } from './config/database';
import { getRedisClient, closeRedis } from './config/redis';
import { initializeWebSocket } from './services/websocket.service';
import { initializeWorkers, closeWorkers } from './queues/queue';
import { initializePubSub, closePubSub } from './services/pubsub.service';

const httpServer = createServer(app);

// Initialize WebSocket
initializeWebSocket(httpServer);

// Initialize server
async function initializeServer() {
    try {
        logger.info('Starting SmartCart server...');

        // Test database connection
        await pool.query('SELECT NOW()');
        logger.info('Database connected');

        // Initialize Redis (non-blocking — app works without it)
        getRedisClient().then(() => {
            logger.info('Redis initialization attempted');
        }).catch(() => {
            logger.warn('Redis unavailable, running without cache');
        });

        // Initialize Redis Pub/Sub for real-time events (non-blocking)
        initializePubSub().catch(() => {
            logger.warn('Redis Pub/Sub unavailable — using direct Socket.io fallback');
        });

        // Initialize background job workers (non-blocking)
        try {
            initializeWorkers();
            logger.info('Background workers initialized');
        } catch (error) {
            logger.warn('Background workers unavailable (Redis required)');
        }

        // Start server with retry on EADDRINUSE
        const startListening = (retries = 3): void => {
            const server = httpServer.listen(config.port, () => {
                logger.info(`Server running on http://localhost:${config.port}`);
                logger.info(`API Docs: http://localhost:${config.port}/api/docs`);
                logger.info(`Environment: ${config.env}`);
            });

            server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE' && retries > 0) {
                    logger.warn(`Port ${config.port} in use, retrying in 2s... (${retries} retries left)`);
                    server.close();
                    setTimeout(() => startListening(retries - 1), 2000);
                } else if (err.code === 'EADDRINUSE') {
                    logger.error(`Port ${config.port} is still in use after retries. Kill the process using it and try again.`);
                    process.exit(1);
                } else {
                    logger.error('Server error', err);
                    process.exit(1);
                }
            });

            // Graceful shutdown
            const shutdown = async (signal: string) => {
                logger.info(`${signal} received, shutting down...`);
                server.close(async () => {
                    await closeWorkers().catch(() => {});
                    await closePubSub().catch(() => {});
                    await closeRedis().catch(() => {});
                    await closeDatabase();
                    logger.info('Server closed');
                    process.exit(0);
                });
            };

            process.on('SIGTERM', () => shutdown('SIGTERM'));
            process.on('SIGINT', () => shutdown('SIGINT'));
        };

        startListening();
    } catch (error) {
        logger.error('Failed to start server', error);
        process.exit(1);
    }
}

initializeServer();
