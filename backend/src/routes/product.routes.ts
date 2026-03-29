import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/products/categories
 * @desc    Get all product categories
 * @access  Public
 */
router.get('/categories', ProductController.getCategories);

/**
 * @route   GET /api/products/search
 * @desc    Search products
 * @access  Public
 */
router.get('/search', ProductController.searchProducts);

/**
 * @route   GET /api/products
 * @desc    Get all products with filters and pagination
 * @access  Public
 */
router.get('/', ProductController.getProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', ProductController.getProduct);

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Admin only)
 */
router.post('/', authMiddleware, adminMiddleware, ProductController.createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, adminMiddleware, ProductController.updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete by default, ?hard=true for permanent)
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, adminMiddleware, ProductController.deleteProduct);

export default router;