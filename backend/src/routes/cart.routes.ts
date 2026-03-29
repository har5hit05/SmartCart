import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All cart routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/cart/count
 * @desc    Get cart item count
 * @access  Private
 */
router.get('/count', CartController.getCartCount);

/**
 * @route   GET /api/cart
 * @desc    Get user's cart
 * @access  Private
 */
router.get('/', CartController.getCart);

/**
 * @route   POST /api/cart
 * @desc    Add product to cart
 * @access  Private
 */
router.post('/', CartController.addToCart);

/**
 * @route   PUT /api/cart/:productId
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put('/:productId', CartController.updateCartItem);

/**
 * @route   DELETE /api/cart/:productId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/:productId', CartController.removeFromCart);

/**
 * @route   DELETE /api/cart
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/', CartController.clearCart);

export default router;