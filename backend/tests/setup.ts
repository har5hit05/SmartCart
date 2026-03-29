/**
 * Jest Setup File
 *
 * Runs after each test suite to clean up open connections.
 * This prevents the "Jest did not exit" warning.
 */

import { pool } from '../src/config/database';
import { closeRedis } from '../src/config/redis';

afterAll(async () => {
  // Close database pool
  await pool.end().catch(() => {});
  // Close Redis connection
  await closeRedis().catch(() => {});
});
