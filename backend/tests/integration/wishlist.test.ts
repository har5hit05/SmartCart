/**
 * Wishlist API Integration Tests
 *
 * Tests adding/removing items from the wishlist,
 * checking if an item is wishlisted, and fetching the full list.
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
  authDelete,
  TestUser,
  TestProduct,
} from '../helpers';

describe('Wishlist API — /api/wishlist', () => {
  let customer: TestUser;
  let product1: TestProduct;
  let product2: TestProduct;

  beforeAll(async () => {
    customer = await createTestUser('wishlist_user');
    product1 = await createTestProduct('wish_item_1');
    product2 = await createTestProduct('wish_item_2');
  });

  afterAll(async () => {
    await deleteTestProduct(product1.id).catch(() => {});
    await deleteTestProduct(product2.id).catch(() => {});
    await deleteTestUser(customer.id).catch(() => {});
  });

  // ─── Authentication Guard ──────────────────────────────────────

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const res = await request(app).get('/api/wishlist');
      expect(res.status).toBe(401);
    });
  });

  // ─── Add to Wishlist ───────────────────────────────────────────

  describe('POST /api/wishlist', () => {
    it('should add a product to the wishlist', async () => {
      const res = await authPost('/api/wishlist', customer.token, {
        product_id: product1.id,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should add a second product to the wishlist', async () => {
      const res = await authPost('/api/wishlist', customer.token, {
        product_id: product2.id,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should handle adding a duplicate product gracefully', async () => {
      const res = await authPost('/api/wishlist', customer.token, {
        product_id: product1.id,
      });

      // Should either succeed silently (ON CONFLICT DO NOTHING) or return success
      expect([200, 201]).toContain(res.status);
    });
  });

  // ─── Get Wishlist ──────────────────────────────────────────────

  describe('GET /api/wishlist', () => {
    it('should return all wishlisted products', async () => {
      const res = await authGet('/api/wishlist', customer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Each item should have product details (flat join)
      const item = res.body.data[0];
      expect(item).toHaveProperty('product_id');
      expect(item).toHaveProperty('name');
    });
  });

  // ─── Check Wishlist ────────────────────────────────────────────

  describe('GET /api/wishlist/check/:productId', () => {
    it('should return true for a wishlisted product', async () => {
      const res = await authGet(`/api/wishlist/check/${product1.id}`, customer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inWishlist).toBe(true);
    });

    it('should return false for a non-wishlisted product', async () => {
      const res = await authGet('/api/wishlist/check/999999', customer.token);

      expect(res.status).toBe(200);
      expect(res.body.data.inWishlist).toBe(false);
    });
  });

  // ─── Remove from Wishlist ──────────────────────────────────────

  describe('DELETE /api/wishlist/:productId', () => {
    it('should remove a product from the wishlist', async () => {
      const res = await authDelete(`/api/wishlist/${product1.id}`, customer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's removed
      const checkRes = await authGet(`/api/wishlist/check/${product1.id}`, customer.token);
      expect(checkRes.body.data.inWishlist).toBe(false);
    });

    it('should return success even when removing a non-existent item', async () => {
      const res = await authDelete('/api/wishlist/999999', customer.token);

      // Should not error out, just succeed
      expect(res.status).toBe(200);
    });
  });
});
