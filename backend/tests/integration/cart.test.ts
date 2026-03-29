/**
 * Cart API Integration Tests
 *
 * Tests adding items, updating quantity, removing items,
 * clearing cart, and cart count.
 */

import request from 'supertest';
import {
  app,
  createTestUser,
  createTestProduct,
  deleteTestUser,
  deleteTestProduct,
  authGet,
  authPost,
  authPut,
  authDelete,
  TestUser,
  TestProduct,
} from '../helpers';

describe('Cart API — /api/cart', () => {
  let customer: TestUser;
  let product1: TestProduct;
  let product2: TestProduct;

  beforeAll(async () => {
    customer = await createTestUser('cart_user');
    product1 = await createTestProduct('cart_item_1', { stock_quantity: 100 });
    product2 = await createTestProduct('cart_item_2', { stock_quantity: 100 });
  });

  afterAll(async () => {
    await deleteTestProduct(product1.id).catch(() => {});
    await deleteTestProduct(product2.id).catch(() => {});
    await deleteTestUser(customer.id).catch(() => {});
  });

  // ─── Authentication Guard ──────────────────────────────────────

  describe('Authentication', () => {
    it('should reject all cart operations without a token', async () => {
      const getRes = await request(app).get('/api/cart');
      expect(getRes.status).toBe(401);

      const postRes = await request(app).post('/api/cart').send({ product_id: 1, quantity: 1 });
      expect(postRes.status).toBe(401);
    });
  });

  // ─── Add to Cart ───────────────────────────────────────────────

  describe('POST /api/cart', () => {
    it('should add a product to the cart', async () => {
      const res = await authPost('/api/cart', customer.token, {
        product_id: product1.id,
        quantity: 2,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('added');
    });

    it('should add a second product to the cart', async () => {
      const res = await authPost('/api/cart', customer.token, {
        product_id: product2.id,
        quantity: 1,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── Get Cart ──────────────────────────────────────────────────

  describe('GET /api/cart', () => {
    it('should return the user cart with items and summary', async () => {
      const res = await authGet('/api/cart', customer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Cart returns { items, summary } structure
      const cart = res.body.data;
      expect(cart).toHaveProperty('items');
      expect(cart).toHaveProperty('summary');
      expect(Array.isArray(cart.items)).toBe(true);
      expect(cart.items.length).toBeGreaterThanOrEqual(2);
      expect(cart.summary).toHaveProperty('subtotal');
      expect(cart.summary).toHaveProperty('total');
      expect(cart.summary.itemCount).toBeGreaterThanOrEqual(3); // 2 + 1
    });
  });

  // ─── Cart Count ────────────────────────────────────────────────

  describe('GET /api/cart/count', () => {
    it('should return the total number of items in the cart', async () => {
      const res = await authGet('/api/cart/count', customer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.count).toBe('number');
      expect(res.body.data.count).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── Update Cart Item ──────────────────────────────────────────

  describe('PUT /api/cart/:productId', () => {
    it('should update the quantity of an item in the cart', async () => {
      const res = await authPut(`/api/cart/${product1.id}`, customer.token, {
        quantity: 5,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('updated');
    });
  });

  // ─── Remove Single Item ────────────────────────────────────────

  describe('DELETE /api/cart/:productId', () => {
    it('should remove a specific product from the cart', async () => {
      const res = await authDelete(`/api/cart/${product2.id}`, customer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's removed
      const cartRes = await authGet('/api/cart', customer.token);
      const productIds = cartRes.body.data.items.map((item: any) => item.product_id);
      expect(productIds).not.toContain(product2.id);
    });
  });

  // ─── Clear Cart ────────────────────────────────────────────────

  describe('DELETE /api/cart', () => {
    it('should clear all items from the cart', async () => {
      const res = await authDelete('/api/cart', customer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('cleared');

      // Verify cart is empty
      const cartRes = await authGet('/api/cart', customer.token);
      expect(cartRes.body.data.items.length).toBe(0);
    });
  });
});
