import {
  registerSchema,
  loginSchema,
  createProductSchema,
  addToCartSchema,
  createOrderSchema,
  chatMessageSchema,
} from '../../src/validations';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should pass with valid data', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'John Doe',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
        full_name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });

    it('should fail with short password', () => {
      const result = registerSchema.safeParse({
        email: 'test@test.com',
        password: '123',
        full_name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });

    it('should fail with missing full_name', () => {
      const result = registerSchema.safeParse({
        email: 'test@test.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should pass with valid credentials', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with missing password', () => {
      const result = loginSchema.safeParse({ email: 'test@test.com' });
      expect(result.success).toBe(false);
    });
  });

  describe('createProductSchema', () => {
    it('should pass with valid product data', () => {
      const result = createProductSchema.safeParse({
        name: 'Wireless Mouse',
        price: 29.99,
        category: 'Electronics',
        stock_quantity: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should fail with negative price', () => {
      const result = createProductSchema.safeParse({
        name: 'Test',
        price: -10,
        category: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('should set default stock_quantity to 0', () => {
      const result = createProductSchema.safeParse({
        name: 'Test',
        price: 10,
        category: 'Test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stock_quantity).toBe(0);
      }
    });
  });

  describe('addToCartSchema', () => {
    it('should pass with valid data', () => {
      const result = addToCartSchema.safeParse({ product_id: 1, quantity: 2 });
      expect(result.success).toBe(true);
    });

    it('should fail with zero quantity', () => {
      const result = addToCartSchema.safeParse({ product_id: 1, quantity: 0 });
      expect(result.success).toBe(false);
    });

    it('should fail with negative product_id', () => {
      const result = addToCartSchema.safeParse({ product_id: -1, quantity: 1 });
      expect(result.success).toBe(false);
    });
  });

  describe('createOrderSchema', () => {
    it('should pass with valid order data', () => {
      const result = createOrderSchema.safeParse({
        shipping_address_line1: '123 Main St',
        shipping_city: 'Mumbai',
        shipping_state: 'Maharashtra',
        shipping_postal_code: '400001',
        shipping_phone: '9876543210',
        payment_method: 'COD',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with invalid payment method', () => {
      const result = createOrderSchema.safeParse({
        shipping_address_line1: '123 Main St',
        shipping_city: 'Mumbai',
        shipping_state: 'Maharashtra',
        shipping_postal_code: '400001',
        shipping_phone: '9876543210',
        payment_method: 'BITCOIN',
      });
      expect(result.success).toBe(false);
    });

    it('should default country to India', () => {
      const result = createOrderSchema.safeParse({
        shipping_address_line1: '123 Main St',
        shipping_city: 'Mumbai',
        shipping_state: 'Maharashtra',
        shipping_postal_code: '400001',
        shipping_phone: '9876543210',
        payment_method: 'UPI',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.shipping_country).toBe('India');
      }
    });
  });

  describe('chatMessageSchema', () => {
    it('should pass with valid message', () => {
      const result = chatMessageSchema.safeParse({ message: 'Hello' });
      expect(result.success).toBe(true);
    });

    it('should fail with empty message', () => {
      const result = chatMessageSchema.safeParse({ message: '' });
      expect(result.success).toBe(false);
    });

    it('should accept conversation history', () => {
      const result = chatMessageSchema.safeParse({
        message: 'Hi',
        conversationHistory: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});
