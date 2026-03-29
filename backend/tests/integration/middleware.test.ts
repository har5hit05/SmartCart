/**
 * Middleware Integration Tests
 *
 * Tests authentication middleware, admin authorization,
 * security headers, CORS, XSS sanitization, and request ID.
 */

import request from 'supertest';
import {
  app,
  createTestUser,
  deleteTestUser,
  TestUser,
} from '../helpers';

describe('Middleware Integration Tests', () => {
  let customer: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    customer = await createTestUser('mw_customer');
    admin = await createTestUser('mw_admin', 'admin');
  });

  afterAll(async () => {
    await deleteTestUser(customer.id).catch(() => {});
    await deleteTestUser(admin.id).catch(() => {});
  });

  // ─── Authentication Middleware ──────────────────────────────────

  describe('Auth Middleware', () => {
    it('should reject requests without Authorization header', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('No authorization token');
    });

    it('should reject requests with malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt');

      expect(res.status).toBe(401);
    });

    it('should accept requests with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customer.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should work with token without Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', customer.token);

      expect(res.status).toBe(200);
    });
  });

  // ─── Admin Middleware ──────────────────────────────────────────

  describe('Admin Middleware', () => {
    it('should allow admin access to admin-only routes', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: `TEST_MW_AdminCheck_${Date.now()}`,
          description: 'Admin middleware test product',
          price: 100,
          stock_quantity: 10,
          category: 'Test',
        });

      expect(res.status).toBe(201);

      // Clean up created product
      if (res.body.data?.id) {
        const { pool } = require('../../src/config/database');
        await pool.query('DELETE FROM products WHERE id = $1', [res.body.data.id]);
      }
    });

    it('should deny customer access to admin-only routes', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({
          name: 'Unauthorized Product',
          description: 'This should fail',
          price: 100,
          stock_quantity: 10,
          category: 'Test',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Admin');
    });
  });

  // ─── Security Headers (Helmet) ─────────────────────────────────

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const res = await request(app).get('/');

      // Helmet headers
      expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(res.headers).toHaveProperty('x-frame-options');
      expect(res.headers).toHaveProperty('content-security-policy');
    });

    it('should not expose X-Powered-By header', async () => {
      const res = await request(app).get('/');

      expect(res.headers).not.toHaveProperty('x-powered-by');
    });
  });

  // ─── Request ID ────────────────────────────────────────────────

  describe('Request ID Middleware', () => {
    it('should include a request ID in 404 responses', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.body).toHaveProperty('requestId');
      expect(res.body.requestId).toBeTruthy();
    });
  });

  // ─── XSS Sanitization ─────────────────────────────────────────

  describe('XSS Sanitization', () => {
    it('should sanitize script tags from request body', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test_xss_${Date.now()}@smartcart.test`,
          password: 'SecurePass123!',
          full_name: '<script>alert("xss")</script>Safe Name',
        });

      // The registration might succeed or fail, but the point is
      // the script tag should be stripped from the name
      if (res.body.data?.user?.full_name) {
        expect(res.body.data.user.full_name).not.toContain('<script>');
      }

      // Clean up if user was created
      if (res.body.data?.user?.id) {
        await deleteTestUser(res.body.data.user.id).catch(() => {});
      }
    });
  });

  // ─── CORS ──────────────────────────────────────────────────────

  describe('CORS', () => {
    it('should allow requests from allowed origins', async () => {
      const res = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should include CORS headers in preflight response', async () => {
      const res = await request(app)
        .options('/')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});
