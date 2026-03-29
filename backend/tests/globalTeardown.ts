/**
 * Jest Global Teardown
 *
 * Runs once after all test suites have completed.
 * Cleans up test data created during integration tests.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

export default async function globalTeardown() {
  const connectionString = `postgresql://${process.env.DATABASE_USER || 'smartcart'}:${process.env.DATABASE_PASSWORD || 'password123'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || '5432'}/${process.env.DATABASE_NAME || 'smartcart'}`;

  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000 });

  try {
    // Clean up test data (users/products created during tests)
    // We delete by email pattern to only remove test data
    await pool.query(`DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%@smartcart.test')`);
    await pool.query(`DELETE FROM wishlist WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%@smartcart.test')`);
    await pool.query(`DELETE FROM cart_items WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%@smartcart.test')`);
    await pool.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%@smartcart.test'))`);
    await pool.query(`DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%@smartcart.test')`);
    await pool.query(`DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%@smartcart.test')`);
    await pool.query(`DELETE FROM users WHERE email LIKE 'test_%@smartcart.test'`);
    await pool.query(`DELETE FROM products WHERE name LIKE 'TEST_%'`);
    await pool.query(`DELETE FROM coupons WHERE code LIKE 'TEST_%'`);

    console.log('\n🧹 Test data cleaned up');
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error);
  } finally {
    await pool.end();
  }
}
