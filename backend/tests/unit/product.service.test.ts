import { ProductService } from '../../src/services/product.service';
import { ProductModel } from '../../src/models/Product';

jest.mock('../../src/models/Product');
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockProductModel = ProductModel as jest.Mocked<typeof ProductModel>;

describe('ProductService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        price: 29.99,
        category: 'Electronics',
        stock_quantity: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockProductModel.create.mockResolvedValue(mockProduct);

      const result = await ProductService.createProduct({
        name: 'Test Product',
        price: 29.99,
        category: 'Electronics',
        stock_quantity: 10,
      });

      expect(result.name).toBe('Test Product');
      expect(result.price).toBe(29.99);
      expect(mockProductModel.create).toHaveBeenCalledTimes(1);
    });

    it('should throw error for missing required fields', async () => {
      await expect(
        ProductService.createProduct({ name: '', price: 10, category: 'Test' })
      ).rejects.toThrow('Name, price, and category are required');
    });

    it('should throw error for negative price', async () => {
      await expect(
        ProductService.createProduct({ name: 'Test', price: -5, category: 'Test' })
      ).rejects.toThrow('Price must be non-negative');
    });

    it('should throw error for negative stock', async () => {
      await expect(
        ProductService.createProduct({ name: 'Test', price: 10, category: 'Test', stock_quantity: -1 })
      ).rejects.toThrow('Stock quantity must be non-negative');
    });
  });

  describe('getProductById', () => {
    it('should return a product by ID', async () => {
      const mockProduct = { id: 1, name: 'Test', price: 10, category: 'Test', stock_quantity: 5, is_active: true, created_at: new Date(), updated_at: new Date() };
      mockProductModel.findById.mockResolvedValue(mockProduct);

      const result = await ProductService.getProductById(1);
      expect(result.id).toBe(1);
    });

    it('should throw error if product not found', async () => {
      mockProductModel.findById.mockResolvedValue(null);

      await expect(ProductService.getProductById(999)).rejects.toThrow('Product not found');
    });
  });

  describe('updateProduct', () => {
    it('should update a product', async () => {
      const mockProduct = { id: 1, name: 'Updated', price: 20, category: 'Test', stock_quantity: 5, is_active: true, created_at: new Date(), updated_at: new Date() };
      mockProductModel.update.mockResolvedValue(mockProduct);

      const result = await ProductService.updateProduct(1, { name: 'Updated', price: 20 });
      expect(result.name).toBe('Updated');
    });

    it('should throw error for negative price in update', async () => {
      await expect(
        ProductService.updateProduct(1, { price: -10 })
      ).rejects.toThrow('Price must be non-negative');
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete a product', async () => {
      mockProductModel.softDelete.mockResolvedValue(true);

      await expect(ProductService.deleteProduct(1)).resolves.not.toThrow();
      expect(mockProductModel.softDelete).toHaveBeenCalledWith(1);
    });

    it('should hard delete a product when specified', async () => {
      mockProductModel.hardDelete.mockResolvedValue(true);

      await expect(ProductService.deleteProduct(1, true)).resolves.not.toThrow();
      expect(mockProductModel.hardDelete).toHaveBeenCalledWith(1);
    });

    it('should throw error if product not found', async () => {
      mockProductModel.softDelete.mockResolvedValue(false);

      await expect(ProductService.deleteProduct(999)).rejects.toThrow('Product not found');
    });
  });

  describe('searchProducts', () => {
    it('should search products', async () => {
      mockProductModel.search.mockResolvedValue([
        { id: 1, name: 'Mouse', price: 29.99, category: 'Electronics', stock_quantity: 50, is_active: true, created_at: new Date(), updated_at: new Date() },
      ]);

      const result = await ProductService.searchProducts('mouse');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Mouse');
    });

    it('should throw error for empty search term', async () => {
      await expect(ProductService.searchProducts('')).rejects.toThrow('Search term is required');
    });
  });

  describe('getCategories', () => {
    it('should return categories', async () => {
      mockProductModel.getCategories.mockResolvedValue(['Electronics', 'Kitchen']);

      const result = await ProductService.getCategories();
      expect(result).toEqual(['Electronics', 'Kitchen']);
    });
  });
});
