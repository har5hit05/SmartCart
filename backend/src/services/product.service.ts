import { ProductModel } from '../models/Product';
import {
    CreateProductDTO,
    UpdateProductDTO,
    ProductFilters,
    PaginationParams,
    PaginatedProducts,
    Product,
} from '../types/Product';
import { logger } from '../utils/logger';
import { StockAlertService } from './stockAlert.service';

export class ProductService {
    /**
     * Create a new product (Admin only)
     */
    static async createProduct(productData: CreateProductDTO): Promise<Product> {
        // Validate input
        if (!productData.name || !productData.price || !productData.category) {
            throw new Error('Name, price, and category are required');
        }

        if (productData.price < 0) {
            throw new Error('Price must be non-negative');
        }

        if (productData.stock_quantity !== undefined && productData.stock_quantity < 0) {
            throw new Error('Stock quantity must be non-negative');
        }

        const product = await ProductModel.create(productData);
        logger.info(`Product created: ${product.name} (ID: ${product.id})`);

        return product;
    }

    /**
     * Get all products with filters and pagination
     */
    static async getProducts(
        filters: ProductFilters = {},
        pagination: PaginationParams = {}
    ): Promise<PaginatedProducts> {
        return await ProductModel.findAll(filters, pagination);
    }

    /**
     * Get single product by ID
     */
    static async getProductById(id: number): Promise<Product> {
        const product = await ProductModel.findById(id);

        if (!product) {
            throw new Error('Product not found');
        }

        return product;
    }

    /**
     * Update product (Admin only)
     */
    static async updateProduct(id: number, updates: UpdateProductDTO): Promise<Product> {
        // Validate updates
        if (updates.price !== undefined && updates.price < 0) {
            throw new Error('Price must be non-negative');
        }

        if (updates.stock_quantity !== undefined && updates.stock_quantity < 0) {
            throw new Error('Stock quantity must be non-negative');
        }

        // Get old stock to detect 0 → >0 transitions
        const oldProduct = await ProductModel.findById(id);
        const oldStock = oldProduct?.stock_quantity ?? 0;

        const product = await ProductModel.update(id, updates);

        if (!product) {
            throw new Error('Product not found');
        }

        // Trigger back-in-stock notifications if stock was 0 and now > 0
        if (oldStock === 0 && product.stock_quantity > 0) {
            StockAlertService.checkAndNotify(product.id, product.stock_quantity).catch((err) => {
                logger.error('Failed to send back-in-stock notifications', err);
            });
        }

        logger.info(`Product updated: ${product.name} (ID: ${product.id})`);

        return product;
    }

    /**
     * Delete product (Admin only)
     */
    static async deleteProduct(id: number, hardDelete: boolean = false): Promise<void> {
        const success = hardDelete
            ? await ProductModel.hardDelete(id)
            : await ProductModel.softDelete(id);

        if (!success) {
            throw new Error('Product not found');
        }

        logger.info(`Product ${hardDelete ? 'hard' : 'soft'} deleted: ID ${id}`);
    }

    /**
     * Get all categories
     */
    static async getCategories(): Promise<string[]> {
        return await ProductModel.getCategories();
    }

    /**
     * Search products
     */
    static async searchProducts(searchTerm: string, limit: number = 10): Promise<Product[]> {
        if (!searchTerm || searchTerm.trim().length === 0) {
            throw new Error('Search term is required');
        }

        return await ProductModel.search(searchTerm, limit);
    }
}