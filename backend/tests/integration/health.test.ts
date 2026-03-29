/**
 * Health & Root Endpoint Integration Tests
 *
 * Tests the basic server health check and root API info endpoints.
 */

import request from 'supertest';
import { app } from '../helpers';

describe('Health & Root Endpoints', () => {
  describe('GET /', () => {
    it('should return API information', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('SmartCart API');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.endpoints).toHaveProperty('auth');
      expect(res.body.endpoints).toHaveProperty('products');
      expect(res.body.endpoints).toHaveProperty('cart');
      expect(res.body.endpoints).toHaveProperty('orders');
    });
  });

  describe('GET /health', () => {
    it('should return healthy status when database is connected', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.services.database).toBe('connected');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('environment');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent-route');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should include the method and path in the error message', async () => {
      const res = await request(app).post('/api/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('POST');
      expect(res.body.message).toContain('/api/does-not-exist');
    });
  });
});
