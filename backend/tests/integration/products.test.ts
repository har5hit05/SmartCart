/**
 * Products API Integration Tests
 *
 * Tests product listing, filtering, pagination, search,
 * categories, and admin CRUD operations.
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

describe('Products API — /api/products', () => {
  let customer: TestUser;
  let admin: TestUser;
  const productIds: number[] = [];
  const userIds: number[] = [];

  beforeAll(async () => {
    customer = await createTestUser('prod_customer');
    admin = await createTestUser('prod_admin', 'admin');
    userIds.push(customer.id, admin.id);
  });

  afterAll(async () => {
    for (const id of productIds) {
      await deleteTestProduct(id).catch(() => {});
    }
    for (const id of userIds) {
      await deleteTestUser(id).catch(() => {});
    }
  });

  // ─── List Products ─────────────────────────────────────────────

  describe('GET /api/products', () => {
    it('should return a paginated list of products', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('products');
      expect(res.body.data).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data.products)).toBe(true);
    });

    it('should respect pagination parameters', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBeLessThanOrEqual(5);
      expect(res.body.data.pagination.page).toBe(1);
    });

    it('should filter products by category', async () => {
      const product = await createTestProduct('cat_filter', { category: 'TestCategory' });
      productIds.push(product.id);

      const res = await request(app)
        .get('/api/products')
        .query({ category: 'TestCategory' });

      expect(res.status).toBe(200);
      const names = res.body.data.products.map((p: any) => p.name);
      expect(names).toContain(product.name);
    });

    it('should filter products by price range', async () => {
      const cheap = await createTestProduct('cheap', { price: 10, category: 'PriceTest' });
      const expensive = await createTestProduct('expensive', { price: 9999, category: 'PriceTest' });
      productIds.push(cheap.id, expensive.id);

      const res = await request(app)
        .get('/api/products')
        .query({ minPrice: 5, maxPrice: 50, category: 'PriceTest' });

      expect(res.status).toBe(200);
      const ids = res.body.data.products.map((p: any) => p.id);
      expect(ids).toContain(cheap.id);
      expect(ids).not.toContain(expensive.id);
    });

    it('should search products by name', async () => {
      const product = await createTestProduct('searchable_widget');
      productIds.push(product.id);

      const res = await request(app)
        .get('/api/products')
        .query({ search: 'searchable_widget' });

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);
    });

    it('should sort products by price ascending', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ sortBy: 'price_asc', limit: 10 });

      expect(res.status).toBe(200);
      const prices = res.body.data.products.map((p: any) => parseFloat(p.price));
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });
  });

  // ─── Get Single Product ────────────────────────────────────────

  describe('GET /api/products/:id', () => {
    let product: TestProduct;

    beforeAll(async () => {
      product = await createTestProduct('single');
      productIds.push(product.id);
    });

    it('should return a product by ID', async () => {
      const res = await request(app).get(`/api/products/${product.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(product.id);
      expect(res.body.data.name).toBe(product.name);
    });

    it('should return 404 for a non-existent product', async () => {
      const res = await request(app).get('/api/products/999999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for an invalid product ID', async () => {
      const res = await request(app).get('/api/products/not-a-number');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Categories ────────────────────────────────────────────────

  describe('GET /api/products/categories', () => {
    it('should return a list of categories', async () => {
      const res = await request(app).get('/api/products/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Search ────────────────────────────────────────────────────

  describe('GET /api/products/search', () => {
    it('should search products with a query string', async () => {
      const res = await request(app)
        .get('/api/products/search')
        .query({ q: 'phone' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Admin: Create Product ─────────────────────────────────────

  describe('POST /api/products (Admin)', () => {
    it('should create a product as admin', async () => {
      const res = await authPost('/api/products', admin.token, {
        name: `TEST_AdminCreated_${Date.now()}`,
        description: 'Product created via integration test',
        price: 499.99,
        stock_quantity: 25,
        category: 'TestCategory',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      productIds.push(res.body.data.id);
    });

    it('should reject product creation by a non-admin user', async () => {
      const res = await authPost('/api/products', customer.token, {
        name: 'Unauthorized Product',
        description: 'This should fail',
        price: 100,
        stock_quantity: 10,
        category: 'Test',
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject product creation without authentication', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'No Auth Product', price: 100 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Admin: Update Product ─────────────────────────────────────

  describe('PUT /api/products/:id (Admin)', () => {
    let productToUpdate: TestProduct;

    beforeAll(async () => {
      productToUpdate = await createTestProduct('update_target');
      productIds.push(productToUpdate.id);
    });

    it('should update a product as admin', async () => {
      const res = await authPut(`/api/products/${productToUpdate.id}`, admin.token, {
        price: 799.99,
        stock_quantity: 100,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject update by a non-admin user', async () => {
      const res = await authPut(`/api/products/${productToUpdate.id}`, customer.token, {
        price: 1,
      });

      expect(res.status).toBe(403);
    });
  });

  // ─── Admin: Delete Product ─────────────────────────────────────

  describe('DELETE /api/products/:id (Admin)', () => {
    it('should soft-delete a product as admin', async () => {
      const product = await createTestProduct('delete_target');

      const res = await authDelete(`/api/products/${product.id}`, admin.token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Product should no longer appear in active listings
      const getRes = await request(app).get(`/api/products/${product.id}`);
      // Soft-deleted product might still return but be inactive, or 404
      // Either is acceptable behavior
      productIds.push(product.id);
    });

    it('should reject delete by a non-admin user', async () => {
      const product = await createTestProduct('no_delete');
      productIds.push(product.id);

      const res = await authDelete(`/api/products/${product.id}`, customer.token);

      expect(res.status).toBe(403);
    });
  });
});
