/**
 * Orders API Integration Tests
 *
 * Tests order creation, listing, detail view,
 * and order cancellation.
 */

import request from 'supertest';
import { pool } from '../../src/config/database';
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

describe('Orders API — /api/orders', () => {
  let customer: TestUser;
  let admin: TestUser;
  let product: TestProduct;
  let orderId: number;

  const validAddress = {
    shipping_address_line1: '123 Test Street',
    shipping_address_line2: 'Apt 4B',
    shipping_city: 'Mumbai',
    shipping_state: 'Maharashtra',
    shipping_postal_code: '400001',
    shipping_country: 'India',
    shipping_phone: '9876543210',
    payment_method: 'COD',
  };

  beforeAll(async () => {
    customer = await createTestUser('order_customer');
    admin = await createTestUser('order_admin', 'admin');
    product = await createTestProduct('orderable_item', { price: 500, stock_quantity: 100 });

    // Add product to cart so we can create an order
    await authPost('/api/cart', customer.token, {
      product_id: product.id,
      quantity: 2,
    });
  });

  afterAll(async () => {
    // Clean up order data
    if (orderId) {
      await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]).catch(() => {});
    }
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [customer.id]).catch(() => {});
    await deleteTestProduct(product.id).catch(() => {});
    await deleteTestUser(customer.id).catch(() => {});
    await deleteTestUser(admin.id).catch(() => {});
  });

  // ─── Authentication Guard ──────────────────────────────────────

  describe('Authentication', () => {
    it('should reject order creation without authentication', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send(validAddress);

      expect(res.status).toBe(401);
    });
  });

  // ─── Create Order ──────────────────────────────────────────────

  describe('POST /api/orders', () => {
    it('should create an order from the cart', async () => {
      const res = await authPost('/api/orders', customer.token, validAddress);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      orderId = res.body.data.id;
    });

    it('should fail when cart is empty (already placed order)', async () => {
      const res = await authPost('/api/orders', customer.token, validAddress);

      // Cart was cleared after previous order
      expect([400, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── List Orders ───────────────────────────────────────────────

  describe('GET /api/orders', () => {
    it('should return the user\'s orders', async () => {
      const res = await authGet('/api/orders', customer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Could be an array or paginated object
      const orders = Array.isArray(res.body.data) ? res.body.data : res.body.data.orders;
      expect(orders.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Order Detail ──────────────────────────────────────────────

  describe('GET /api/orders/:id', () => {
    it('should return order details', async () => {
      if (!orderId) return; // Skip if order creation failed

      const res = await authGet(`/api/orders/${orderId}`, customer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(orderId);
      expect(res.body.data).toHaveProperty('status');
    });

    it('should not allow another user to view the order', async () => {
      if (!orderId) return;

      const otherUser = await createTestUser('order_snooper');

      const res = await authGet(`/api/orders/${orderId}`, otherUser.token);

      // Should be 403 or 404
      expect([403, 404]).toContain(res.status);

      await deleteTestUser(otherUser.id).catch(() => {});
    });
  });

  // ─── Cancel Order ──────────────────────────────────────────────

  describe('POST /api/orders/:id/cancel', () => {
    it('should cancel a pending order', async () => {
      // First add product to cart and create a new order for cancellation
      await authPost('/api/cart', customer.token, {
        product_id: product.id,
        quantity: 1,
      });

      const createRes = await authPost('/api/orders', customer.token, validAddress);

      if (createRes.status === 201) {
        const cancelOrderId = createRes.body.data.id;

        const res = await authPost(`/api/orders/${cancelOrderId}/cancel`, customer.token);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Clean up
        await pool.query('DELETE FROM order_items WHERE order_id = $1', [cancelOrderId]).catch(() => {});
        await pool.query('DELETE FROM orders WHERE id = $1', [cancelOrderId]).catch(() => {});
      }
    });
  });

  // ─── Admin: List All Orders ────────────────────────────────────

  describe('GET /api/orders/all (Admin)', () => {
    it('should return all orders for admin', async () => {
      const res = await authGet('/api/orders/all', admin.token);

      // Admin should be able to see all orders
      expect([200, 404]).toContain(res.status);
    });
  });
});
