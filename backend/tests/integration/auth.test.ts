/**
 * Auth API Integration Tests
 *
 * Tests user registration, login, token refresh, logout,
 * and the authenticated /me endpoint.
 */

import request from 'supertest';
import { app, createTestUser, deleteTestUser, TestUser } from '../helpers';

describe('Auth API — /api/auth', () => {
  const testEmails: string[] = [];
  const testUserIds: number[] = [];

  afterAll(async () => {
    // Clean up any users created during tests
    for (const id of testUserIds) {
      await deleteTestUser(id).catch(() => {});
    }
  });

  // ─── Registration ──────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const email = `test_reg_${Date.now()}@smartcart.test`;
      testEmails.push(email);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          full_name: 'Test Registration User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('registered');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe(email);

      testUserIds.push(res.body.data.user.id);
    });

    it('should reject duplicate email registration', async () => {
      const email = `test_dup_${Date.now()}@smartcart.test`;

      // First registration
      const first = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          full_name: 'First User',
        });
      testUserIds.push(first.body.data.user.id);

      // Duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'AnotherPass456!',
          full_name: 'Duplicate User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    let loginUser: TestUser;

    beforeAll(async () => {
      loginUser = await createTestUser('login');
      testUserIds.push(loginUser.id);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUser.email,
          password: loginUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe(loginUser.email);
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUser.email,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@nowhere.com',
          password: 'AnyPass123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Token Refresh ─────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('should refresh an access token with a valid refresh token', async () => {
      const user = await createTestUser('refresh');
      testUserIds.push(user.id);

      // Login to get a refresh token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });

      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('should reject an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token-string' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Get Current User ──────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    let meUser: TestUser;

    beforeAll(async () => {
      meUser = await createTestUser('me');
      testUserIds.push(meUser.id);
    });

    it('should return current user info with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${meUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(meUser.email);
      expect(res.body.data.full_name).toBe(meUser.full_name);
    });

    it('should reject request without a token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request with an invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Logout ────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with a valid refresh token', async () => {
      const user = await createTestUser('logout');
      testUserIds.push(user.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });

      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
