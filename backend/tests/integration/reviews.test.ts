/**
 * Reviews API Integration Tests
 *
 * Tests review creation, update, deletion, fetching product reviews,
 * marking as helpful, and the "my review" endpoint.
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

describe('Reviews API — /api/products/:id/reviews', () => {
  let reviewer: TestUser;
  let anotherUser: TestUser;
  let product: TestProduct;
  let createdReviewId: number;

  beforeAll(async () => {
    reviewer = await createTestUser('reviewer');
    anotherUser = await createTestUser('another_reviewer');
    product = await createTestProduct('reviewed_product');
  });

  afterAll(async () => {
    await deleteTestProduct(product.id).catch(() => {});
    await deleteTestUser(reviewer.id).catch(() => {});
    await deleteTestUser(anotherUser.id).catch(() => {});
  });

  // ─── Create Review ─────────────────────────────────────────────

  describe('POST /api/products/:productId/reviews', () => {
    it('should create a review for a product', async () => {
      const res = await authPost(`/api/products/${product.id}/reviews`, reviewer.token, {
        rating: 5,
        title: 'Excellent product!',
        comment: 'Really loved this product, highly recommended.',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.rating).toBe(5);
      createdReviewId = res.body.data.id;
    });

    it('should prevent duplicate reviews from same user', async () => {
      const res = await authPost(`/api/products/${product.id}/reviews`, reviewer.token, {
        rating: 4,
        title: 'Second attempt',
        comment: 'This should fail',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should allow a different user to review the same product', async () => {
      const res = await authPost(`/api/products/${product.id}/reviews`, anotherUser.token, {
        rating: 3,
        title: 'Decent product',
        comment: 'It is okay, nothing special.',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject review without authentication', async () => {
      const res = await request(app)
        .post(`/api/products/${product.id}/reviews`)
        .send({ rating: 5, title: 'Test', comment: 'Test' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Get Product Reviews ───────────────────────────────────────

  describe('GET /api/products/:productId/reviews', () => {
    it('should return reviews for a product with stats', async () => {
      const res = await request(app)
        .get(`/api/products/${product.id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('reviews');
      expect(res.body.data).toHaveProperty('stats');
      expect(Array.isArray(res.body.data.reviews)).toBe(true);
      expect(res.body.data.reviews.length).toBeGreaterThanOrEqual(2);

      // Stats should reflect the reviews
      expect(res.body.data.stats).toHaveProperty('average_rating');
      expect(res.body.data.stats).toHaveProperty('total_reviews');
      expect(res.body.data.stats.total_reviews).toBeGreaterThanOrEqual(2);
    });

    it('should support sorting by newest', async () => {
      const res = await request(app)
        .get(`/api/products/${product.id}/reviews`)
        .query({ sortBy: 'newest' });

      expect(res.status).toBe(200);
      expect(res.body.data.reviews.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/products/${product.id}/reviews`)
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.reviews.length).toBeLessThanOrEqual(1);
    });
  });

  // ─── Get My Review ─────────────────────────────────────────────

  describe('GET /api/products/:productId/reviews/mine', () => {
    it('should return the current user\'s review', async () => {
      const res = await authGet(`/api/products/${product.id}/reviews/mine`, reviewer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('rating', 5);
      expect(res.body.data).toHaveProperty('title', 'Excellent product!');
    });
  });

  // ─── Update Review ─────────────────────────────────────────────

  describe('PUT /api/reviews/:reviewId', () => {
    it('should update the user\'s own review', async () => {
      const res = await authPut(`/api/reviews/${createdReviewId}`, reviewer.token, {
        rating: 4,
        title: 'Updated: Great product',
        comment: 'Changed my mind slightly, still good.',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(4);
    });

    it('should not allow updating another user\'s review', async () => {
      const res = await authPut(`/api/reviews/${createdReviewId}`, anotherUser.token, {
        rating: 1,
        title: 'Hacked',
      });

      // Should be 403 or 404 (depends on implementation)
      expect([403, 404]).toContain(res.status);
    });
  });

  // ─── Mark Helpful ──────────────────────────────────────────────

  describe('POST /api/reviews/:reviewId/helpful', () => {
    it('should mark a review as helpful', async () => {
      const res = await authPost(`/api/reviews/${createdReviewId}/helpful`, anotherUser.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── Delete Review ─────────────────────────────────────────────

  describe('DELETE /api/reviews/:reviewId', () => {
    it('should not allow deleting another user\'s review', async () => {
      const res = await authDelete(`/api/reviews/${createdReviewId}`, anotherUser.token);

      expect([403, 404]).toContain(res.status);
    });

    it('should delete the user\'s own review', async () => {
      const res = await authDelete(`/api/reviews/${createdReviewId}`, reviewer.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
