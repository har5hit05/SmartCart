/**
 * Test Helpers
 *
 * Shared utilities for integration tests including:
 * - App instance for Supertest
 * - Token generation helpers
 * - Test data factories
 * - Database cleanup utilities
 */

import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';
import { generateAccessToken } from '../src/utils/jwt';
import bcrypt from 'bcryptjs';

// Export app for Supertest
export { app };

// ─── Types ─────────────────────────────────────────────────────────

export interface TestUser {
  id: number;
  email: string;
  full_name: string;
  role: 'customer' | 'admin';
  password: string; // plain text for login tests
  token: string;    // JWT access token
}

export interface TestProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
}

// ─── User Helpers ──────────────────────────────────────────────────

/**
 * Create a test user directly in the database and return a JWT token.
 * Uses unique email pattern: test_<suffix>@smartcart.test
 */
export async function createTestUser(
  suffix: string,
  role: 'customer' | 'admin' = 'customer'
): Promise<TestUser> {
  const email = `test_${suffix}_${Date.now()}@smartcart.test`;
  const password = 'TestPass123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, is_active, is_email_verified)
     VALUES ($1, $2, $3, $4, true, true)
     RETURNING id, email, full_name, role`,
    [email, hashedPassword, `Test ${suffix}`, role]
  );

  const user = result.rows[0];
  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    password,
    token,
  };
}

/**
 * Delete a test user and all associated data
 */
export async function deleteTestUser(userId: number): Promise<void> {
  await pool.query('DELETE FROM reviews WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM wishlist WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [userId]);
  await pool.query('DELETE FROM orders WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

// ─── Product Helpers ───────────────────────────────────────────────

/**
 * Create a test product directly in the database
 */
export async function createTestProduct(suffix: string, overrides: Partial<{
  price: number;
  stock_quantity: number;
  category: string;
  is_active: boolean;
}> = {}): Promise<TestProduct> {
  const {
    price = 999.99,
    stock_quantity = 50,
    category = 'Electronics',
    is_active = true,
  } = overrides;

  const result = await pool.query(
    `INSERT INTO products (name, description, price, stock_quantity, category, is_active, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, category, price, stock_quantity`,
    [
      `TEST_Product_${suffix}_${Date.now()}`,
      `Test product description for ${suffix}`,
      price,
      stock_quantity,
      category,
      is_active,
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
    ]
  );

  return result.rows[0];
}

/**
 * Delete a test product
 */
export async function deleteTestProduct(productId: number): Promise<void> {
  await pool.query('DELETE FROM reviews WHERE product_id = $1', [productId]);
  await pool.query('DELETE FROM wishlist WHERE product_id = $1', [productId]);
  await pool.query('DELETE FROM cart_items WHERE product_id = $1', [productId]);
  await pool.query('DELETE FROM order_items WHERE product_id = $1', [productId]);
  await pool.query('DELETE FROM products WHERE id = $1', [productId]);
}

// ─── Coupon Helpers ────────────────────────────────────────────────

export async function createTestCoupon(suffix: string, overrides: Partial<{
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_value: number;
  max_discount: number;
  usage_limit: number;
  is_active: boolean;
}> = {}): Promise<any> {
  const {
    discount_type = 'percentage',
    discount_value = 10,
    min_order_value = 100,
    max_discount = 500,
    usage_limit = 100,
    is_active = true,
  } = overrides;

  const code = `TEST_${suffix}_${Date.now()}`.toUpperCase();
  const result = await pool.query(
    `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, is_active, starts_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() + INTERVAL '30 days')
     RETURNING *`,
    [code, `Test coupon ${suffix}`, discount_type, discount_value, min_order_value, max_discount, usage_limit, is_active]
  );

  return result.rows[0];
}

export async function deleteTestCoupon(couponId: number): Promise<void> {
  await pool.query('DELETE FROM coupon_usage WHERE coupon_id = $1', [couponId]);
  await pool.query('DELETE FROM coupons WHERE id = $1', [couponId]);
}

// ─── Request Helpers ───────────────────────────────────────────────

/**
 * Make an authenticated GET request
 */
export function authGet(url: string, token: string) {
  return request(app)
    .get(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Make an authenticated POST request
 */
export function authPost(url: string, token: string, body?: any) {
  const req = request(app)
    .post(url)
    .set('Authorization', `Bearer ${token}`);
  if (body) req.send(body);
  return req;
}

/**
 * Make an authenticated PUT request
 */
export function authPut(url: string, token: string, body?: any) {
  const req = request(app)
    .put(url)
    .set('Authorization', `Bearer ${token}`);
  if (body) req.send(body);
  return req;
}

/**
 * Make an authenticated DELETE request
 */
export function authDelete(url: string, token: string) {
  return request(app)
    .delete(url)
    .set('Authorization', `Bearer ${token}`);
}

// ─── Database Helpers ──────────────────────────────────────────────

/**
 * Close the database pool (call in afterAll)
 */
export async function closeTestDb(): Promise<void> {
  await pool.end();
}
