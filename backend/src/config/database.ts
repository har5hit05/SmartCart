import { Pool } from 'pg';
import { config } from './index';
import { logger } from '../utils/logger';

// Support DATABASE_URL (used by Neon, Render, Railway, etc.) or fallback to individual params
const connectionString = process.env.DATABASE_URL
    || `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}`;

// Mask password in logs
const maskedUrl = connectionString.replace(/:[^:@]+@/, ':***@');
logger.info('Connection string (without password):', maskedUrl);

export const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Enable SSL for cloud databases (Neon, Supabase, etc.)
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

// Test connection
pool.on('connect', () => {
    logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    logger.error('Unexpected database error', err);
    process.exit(-1);
});

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        logger.error('Query error', { text, error });
        throw error;
    }
}

// Graceful shutdown
export async function closeDatabase() {
    await pool.end();
    logger.info('Database pool closed');
}
