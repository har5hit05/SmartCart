import { CartService } from '../../src/services/cart.service';
import { CartModel } from '../../src/models/Cart';
import { ProductModel } from '../../src/models/Product';

jest.mock('../../src/models/Cart');
jest.mock('../../src/models/Product');
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockCartModel = CartModel as jest.Mocked<typeof CartModel>;
const mockProductModel = ProductModel as jest.Mocked<typeof ProductModel>;

describe('CartService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addToCart', () => {
    it('should add product to cart successfully', async () => {
      const mockProduct = { id: 1, name: 'Test', price: 10, stock_quantity: 50, is_active: true, category: 'Test', created_at: new Date(), updated_at: new Date() };
      mockProductModel.findById.mockResolvedValue(mockProduct);
      mockProductModel.hasStock.mockResolvedValue(true);
      mockCartModel.addItem.mockResolvedValue({} as any);

      await expect(CartService.addToCart(1, { product_id: 1, quantity: 2 })).resolves.not.toThrow();
      expect(mockCartModel.addItem).toHaveBeenCalledWith(1, { product_id: 1, quantity: 2 });
    });

    it('should throw error for zero quantity', async () => {
      await expect(
        CartService.addToCart(1, { product_id: 1, quantity: 0 })
      ).rejects.toThrow('Quantity must be greater than 0');
    });

    it('should throw error if product not found', async () => {
      mockProductModel.findById.mockResolvedValue(null);

      await expect(
        CartService.addToCart(1, { product_id: 999, quantity: 1 })
      ).rejects.toThrow('Product not found');
    });

    it('should throw error if product is inactive', async () => {
      mockProductModel.findById.mockResolvedValue({ id: 1, is_active: false } as any);

      await expect(
        CartService.addToCart(1, { product_id: 1, quantity: 1 })
      ).rejects.toThrow('Product is not available');
    });

    it('should throw error if insufficient stock', async () => {
      mockProductModel.findById.mockResolvedValue({ id: 1, is_active: true, stock_quantity: 2 } as any);
      mockProductModel.hasStock.mockResolvedValue(false);

      await expect(
        CartService.addToCart(1, { product_id: 1, quantity: 5 })
      ).rejects.toThrow('items available in stock');
    });
  });

  describe('getCart', () => {
    it('should return cart with summary', async () => {
      mockCartModel.getCartItems.mockResolvedValue([
        {
          id: 1, user_id: 1, product_id: 1, quantity: 2,
          product: { id: 1, name: 'Test', price: 100, category: 'Test', stock_quantity: 50, is_active: true, created_at: new Date(), updated_at: new Date() },
          subtotal: 200,
          created_at: new Date(), updated_at: new Date(),
        },
      ]);

      const result = await CartService.getCart(1);
      expect(result.items).toHaveLength(1);
      expect(result.summary.subtotal).toBe(200);
      expect(result.summary.tax).toBeCloseTo(36); // 18% of 200
      expect(result.summary.shippingFee).toBe(50); // Under 500 -> ₹50 shipping
    });

    it('should filter out inactive products', async () => {
      mockCartModel.getCartItems.mockResolvedValue([
        {
          id: 1, user_id: 1, product_id: 1, quantity: 1,
          product: { id: 1, name: 'Active', price: 50, category: 'Test', stock_quantity: 10, is_active: true, created_at: new Date(), updated_at: new Date() },
          subtotal: 50, created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, user_id: 1, product_id: 2, quantity: 1,
          product: { id: 2, name: 'Inactive', price: 30, category: 'Test', stock_quantity: 0, is_active: false, created_at: new Date(), updated_at: new Date() },
          subtotal: 30, created_at: new Date(), updated_at: new Date(),
        },
      ]);

      const result = await CartService.getCart(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].product.name).toBe('Active');
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      mockCartModel.removeItem.mockResolvedValue(true);

      await expect(CartService.removeFromCart(1, 1)).resolves.not.toThrow();
    });

    it('should throw error if item not in cart', async () => {
      mockCartModel.removeItem.mockResolvedValue(false);

      await expect(CartService.removeFromCart(1, 999)).rejects.toThrow('Item not found in cart');
    });
  });
});
