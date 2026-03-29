import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import {
    CreateProductDTO,
    UpdateProductDTO,
    ProductFilters,
    PaginationParams,
} from '../types/Product';
import { logger } from '../utils/logger';

export class ProductController {
    /**
     * POST /api/products
     * Create a new product (Admin only)
     */
    static async createProduct(req: Request, res: Response): Promise<void> {
        try {
            const productData: CreateProductDTO = req.body;
            const product = await ProductService.createProduct(productData);

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: product,
            });
        } catch (error) {
            logger.error('Create product error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create product';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * GET /api/products
     * Get all products with filters and pagination
     */
    static async getProducts(req: Request, res: Response): Promise<void> {
        try {
            const filters: ProductFilters = {
                category: req.query.category as string,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
                search: req.query.search as string,
                isActive: req.query.isActive === 'false' ? false : true,
            };

            // Parse sortBy — frontend sends combined values like "price_asc", "created_at_desc"
            let sortBy = 'created_at';
            let sortOrder: 'asc' | 'desc' = 'desc';
            const sortParam = req.query.sortBy as string;
            if (sortParam) {
                const allowedColumns = ['name', 'price', 'created_at', 'stock_quantity', 'category'];
                if (sortParam.endsWith('_asc') || sortParam.endsWith('_desc')) {
                    const lastUnderscore = sortParam.lastIndexOf('_');
                    const col = sortParam.substring(0, lastUnderscore);
                    const dir = sortParam.substring(lastUnderscore + 1) as 'asc' | 'desc';
                    if (allowedColumns.includes(col)) {
                        sortBy = col;
                        sortOrder = dir;
                    }
                } else if (allowedColumns.includes(sortParam)) {
                    sortBy = sortParam;
                }
            }
            if (req.query.sortOrder === 'asc' || req.query.sortOrder === 'desc') {
                sortOrder = req.query.sortOrder;
            }

            const pagination: PaginationParams = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: sortBy as any,
                sortOrder,
            };

            const result = await ProductService.getProducts(filters, pagination);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error('Get products error', error);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch products',
            });
        }
    }

    /**
     * GET /api/products/:id
     * Get single product by ID
     */
    static async getProduct(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);

            if (isNaN(id)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid product ID',
                });
                return;
            }

            const product = await ProductService.getProductById(id);

            res.status(200).json({
                success: true,
                data: product,
            });
        } catch (error) {
            logger.error('Get product error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch product';

            res.status(404).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * PUT /api/products/:id
     * Update product (Admin only)
     */
    static async updateProduct(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);

            if (isNaN(id)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid product ID',
                });
                return;
            }

            const updates: UpdateProductDTO = req.body;
            const product = await ProductService.updateProduct(id, updates);

            res.status(200).json({
                success: true,
                message: 'Product updated successfully',
                data: product,
            });
        } catch (error) {
            logger.error('Update product error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update product';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * DELETE /api/products/:id
     * Delete product (Admin only)
     */
    static async deleteProduct(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);

            if (isNaN(id)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid product ID',
                });
                return;
            }

            const hardDelete = req.query.hard === 'true';
            await ProductService.deleteProduct(id, hardDelete);

            res.status(200).json({
                success: true,
                message: 'Product deleted successfully',
            });
        } catch (error) {
            logger.error('Delete product error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete product';

            res.status(404).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * GET /api/products/categories
     * Get all product categories
     */
    static async getCategories(req: Request, res: Response): Promise<void> {
        try {
            const categories = await ProductService.getCategories();

            res.status(200).json({
                success: true,
                data: categories,
            });
        } catch (error) {
            logger.error('Get categories error', error);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
            });
        }
    }

    /**
     * GET /api/products/search
     * Search products
     */
    static async searchProducts(req: Request, res: Response): Promise<void> {
        try {
            const searchTerm = req.query.q as string;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

            const products = await ProductService.searchProducts(searchTerm, limit);

            res.status(200).json({
                success: true,
                data: products,
            });
        } catch (error) {
            logger.error('Search products error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to search products';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }
}