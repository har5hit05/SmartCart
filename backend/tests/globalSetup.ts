/**
 * Jest Global Setup
 *
 * Runs once before all test suites.
 * Sets up the test database schema for integration tests.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

export default async function globalSetup() {
  const connectionString = `postgresql://${process.env.DATABASE_USER || 'smartcart'}:${process.env.DATABASE_PASSWORD || 'password123'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || '5432'}/${process.env.DATABASE_NAME || 'smartcart'}`;

  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000 });

  try {
    // Verify DB connection
    await pool.query('SELECT NOW()');
    console.log('\n✅ Test database connected');

    // Create test-specific tables if they don't exist (schema should already exist from migrations)
    // We just verify the tables are present
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(`📋 Available tables: ${tables.rows.map((r: any) => r.table_name).join(', ')}`);
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
