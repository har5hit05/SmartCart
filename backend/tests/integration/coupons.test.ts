/**
 * Coupons API Integration Tests
 *
 * Tests coupon validation, available coupons listing,
 * and admin CRUD operations.
 */

import request from 'supertest';
import {
  app,
  createTestUser,
  createTestCoupon,
  deleteTestUser,
  deleteTestCoupon,
  authGet,
  authPost,
  authPut,
  authDelete,
  TestUser,
} from '../helpers';

describe('Coupons API — /api/coupons', () => {
  let customer: TestUser;
  let admin: TestUser;
  const couponIds: number[] = [];

  beforeAll(async () => {
    customer = await createTestUser('coupon_customer');
    admin = await createTestUser('coupon_admin', 'admin');
  });

  afterAll(async () => {
    for (const id of couponIds) {
      await deleteTestCoupon(id).catch(() => {});
    }
    await deleteTestUser(customer.id).catch(() => {});
    await deleteTestUser(admin.id).catch(() => {});
  });

  // ─── Available Coupons ─────────────────────────────────────────

  describe('GET /api/coupons/available', () => {
    it('should return a list of active coupons', async () => {
      const coupon = await createTestCoupon('available');
      couponIds.push(coupon.id);

      const res = await request(app).get('/api/coupons/available');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Should include public fields only
      if (res.body.data.length > 0) {
        const c = res.body.data[0];
        expect(c).toHaveProperty('code');
        expect(c).toHaveProperty('discount_type');
        expect(c).toHaveProperty('discount_value');
      }
    });
  });

  // ─── Validate Coupon ───────────────────────────────────────────

  describe('POST /api/coupons/validate', () => {
    let testCoupon: any;

    beforeAll(async () => {
      testCoupon = await createTestCoupon('validate', {
        discount_type: 'percentage',
        discount_value: 15,
        min_order_value: 500,
        max_discount: 200,
      });
      couponIds.push(testCoupon.id);
    });

    it('should validate a correct coupon code', async () => {
      const res = await authPost('/api/coupons/validate', customer.token, {
        code: testCoupon.code,
        order_total: 1000,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('discount_amount');
      expect(res.body.data.discount_amount).toBeGreaterThan(0);
      expect(res.body.data.discount_amount).toBeLessThanOrEqual(200);
    });

    it('should reject coupon when order total is below minimum', async () => {
      const res = await authPost('/api/coupons/validate', customer.token, {
        code: testCoupon.code,
        order_total: 100, // below min_order_value of 500
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject an invalid coupon code', async () => {
      const res = await authPost('/api/coupons/validate', customer.token, {
        code: 'NONEXISTENT_CODE',
        order_total: 1000,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject validation without authentication', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: testCoupon.code, order_total: 1000 });

      expect(res.status).toBe(401);
    });

    it('should reject validation with missing fields', async () => {
      const res = await authPost('/api/coupons/validate', customer.token, {
        code: testCoupon.code,
        // missing order_total
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Admin: Create Coupon ──────────────────────────────────────

  describe('POST /api/coupons (Admin)', () => {
    it('should create a coupon as admin', async () => {
      const res = await authPost('/api/coupons/admin', admin.token, {
        code: `TEST_ADMIN_${Date.now()}`,
        description: 'Admin-created test coupon',
        discount_type: 'flat',
        discount_value: 100,
        min_order_value: 500,
        max_discount: 100,
        usage_limit: 50,
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      couponIds.push(res.body.data.id);
    });

    it('should reject coupon creation by non-admin', async () => {
      const res = await authPost('/api/coupons/admin', customer.token, {
        code: 'UNAUTHORIZED_COUPON',
        discount_type: 'flat',
        discount_value: 50,
      });

      expect(res.status).toBe(403);
    });
  });

  // ─── Admin: Delete Coupon ──────────────────────────────────────

  describe('DELETE /api/coupons/:id (Admin)', () => {
    it('should delete a coupon as admin', async () => {
      const coupon = await createTestCoupon('delete_me');

      const res = await authDelete(`/api/coupons/admin/${coupon.id}`, admin.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent coupon', async () => {
      const res = await authDelete('/api/coupons/admin/999999', admin.token);

      expect(res.status).toBe(404);
    });
  });
});
