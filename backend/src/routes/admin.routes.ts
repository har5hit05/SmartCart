import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware, adminMiddleware);

/**
 * @route   GET /api/admin/analytics/dashboard
 * @desc    Get dashboard analytics
 * @access  Admin
 */
router.get('/analytics/dashboard', AdminController.getDashboardAnalytics);

/**
 * @route   GET /api/admin/analytics/users
 * @desc    Get user analytics
 * @access  Admin
 */
router.get('/analytics/users', AdminController.getUserAnalytics);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination, search, and role filter
 * @access  Admin
 */
router.get('/users', AdminController.getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user with order count
 * @access  Admin
 */
router.get('/users/:id', AdminController.getUserById);

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Activate/deactivate a user
 * @access  Admin
 */
router.put('/users/:id/status', AdminController.updateUserStatus);

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with pagination, status filter, and search
 * @access  Admin
 */
router.get('/orders', AdminController.getAllOrders);

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.put('/orders/:id/status', AdminController.updateOrderStatus);

export default router;
