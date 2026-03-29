import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All order routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/orders
 * @desc    Create order from cart
 * @access  Private
 */
router.post('/', OrderController.createOrder);

/**
 * @route   GET /api/orders
 * @desc    Get user's orders
 * @access  Private
 */
router.get('/', OrderController.getUserOrders);

/**
 * @route   GET /api/orders/all
 * @desc    Get all orders (Admin)
 * @access  Private (Admin)
 */
router.get('/all', adminMiddleware, OrderController.getAllOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order
 * @access  Private (Own order or Admin)
 */
router.get('/:id', OrderController.getOrder);

/**
 * @route   GET /api/orders/:id/history
 * @desc    Get order status history
 * @access  Private
 */
router.get('/:id/history', OrderController.getOrderHistory);

/**
 * @route   GET /api/orders/:id/invoice
 * @desc    Download order invoice PDF
 * @access  Private (Own order or Admin)
 */
router.get('/:id/invoice', OrderController.downloadInvoice);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (Admin)
 * @access  Private (Admin)
 */
router.put('/:id/status', adminMiddleware, OrderController.updateOrderStatus);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order (Customer)
 * @access  Private
 */
router.post('/:id/cancel', OrderController.cancelOrder);

export default router;