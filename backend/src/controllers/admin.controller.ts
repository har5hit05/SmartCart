import { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { StockAlertService } from '../services/stockAlert.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { publishEvent, CHANNELS } from '../services/pubsub.service';

export class AdminController {
    /**
     * GET /api/admin/analytics/dashboard
     * Get dashboard analytics
     */
    static async getDashboardAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const [
                totalUsersResult,
                totalProductsResult,
                totalOrdersResult,
                revenueResult,
                recentOrdersResult,
                ordersByStatusResult,
                topProductsResult,
                dailyRevenueResult,
            ] = await Promise.all([
                pool.query('SELECT COUNT(*) FROM users WHERE is_active = TRUE'),
                pool.query('SELECT COUNT(*) FROM products WHERE is_active = TRUE'),
                pool.query('SELECT COUNT(*) FROM orders'),
                pool.query("SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders WHERE status != 'CANCELLED'"),
                pool.query(
                    `SELECT o.id, o.total, o.status, o.created_at, u.full_name, u.email
                     FROM orders o JOIN users u ON o.user_id = u.id
                     ORDER BY o.created_at DESC LIMIT 5`
                ),
                pool.query(
                    `SELECT status, COUNT(*) as count
                     FROM orders GROUP BY status ORDER BY count DESC`
                ),
                pool.query(
                    `SELECT oi.product_name, SUM(oi.quantity) as total_sold, SUM(oi.subtotal) as total_revenue
                     FROM order_items oi
                     JOIN orders o ON oi.order_id = o.id
                     WHERE o.status != 'CANCELLED'
                     GROUP BY oi.product_name
                     ORDER BY total_sold DESC LIMIT 5`
                ),
                pool.query(
                    `SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
                     FROM orders
                     WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND status != 'CANCELLED'
                     GROUP BY DATE(created_at)
                     ORDER BY date`
                ),
            ]);

            res.status(200).json({
                success: true,
                data: {
                    overview: {
                        totalUsers: parseInt(totalUsersResult.rows[0].count),
                        totalProducts: parseInt(totalProductsResult.rows[0].count),
                        totalOrders: parseInt(totalOrdersResult.rows[0].count),
                        totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
                    },
                    recentOrders: recentOrdersResult.rows,
                    ordersByStatus: ordersByStatusResult.rows,
                    topProducts: topProductsResult.rows,
                    dailyRevenue: dailyRevenueResult.rows,
                },
            });
        } catch (error) {
            logger.error('Dashboard analytics error', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch analytics',
            });
        }
    }

    /**
     * GET /api/admin/users
     * Get all users with pagination, search, and role filter
     */
    static async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string || '';
            const role = req.query.role as string || '';
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE 1=1';
            const params: any[] = [];
            let paramIndex = 1;

            if (search) {
                whereClause += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            if (role && (role === 'customer' || role === 'admin')) {
                whereClause += ` AND u.role = $${paramIndex}`;
                params.push(role);
                paramIndex++;
            }

            const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].count);

            const usersQuery = `
                SELECT u.id, u.email, u.full_name, u.profile_picture, u.role, u.is_email_verified, u.is_active, u.created_at, u.updated_at
                FROM users u
                ${whereClause}
                ORDER BY u.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            const usersResult = await pool.query(usersQuery, [...params, limit, offset]);

            res.status(200).json({
                success: true,
                data: {
                    users: usersResult.rows,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                },
            });
        } catch (error) {
            logger.error('Get all users error', error);
            res.status(500).json({ success: false, message: 'Failed to fetch users' });
        }
    }

    /**
     * GET /api/admin/users/:id
     * Get single user with order count
     */
    static async getUserById(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.id as string;

            const userQuery = `
                SELECT u.id, u.email, u.full_name, u.profile_picture, u.role, u.is_email_verified, u.is_active, u.created_at, u.updated_at,
                       COUNT(o.id) as order_count
                FROM users u
                LEFT JOIN orders o ON u.id = o.user_id
                WHERE u.id = $1
                GROUP BY u.id
            `;

            const result = await pool.query(userQuery, [userId]);

            if (result.rows.length === 0) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }

            const user = result.rows[0];
            user.order_count = parseInt(user.order_count);

            res.status(200).json({ success: true, data: user });
        } catch (error) {
            logger.error('Get user by ID error', error);
            res.status(500).json({ success: false, message: 'Failed to fetch user' });
        }
    }

    /**
     * PUT /api/admin/users/:id/status
     * Activate or deactivate a user
     */
    static async updateUserStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.params.id as string;

            const query = `
                UPDATE users
                SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id, email, full_name, role, is_active, updated_at
            `;

            const result = await pool.query(query, [userId]);

            if (result.rows.length === 0) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }

            const user = result.rows[0];
            res.status(200).json({
                success: true,
                message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
                data: user,
            });
        } catch (error) {
            logger.error('Update user status error', error);
            res.status(500).json({ success: false, message: 'Failed to update user status' });
        }
    }

    /**
     * GET /api/admin/orders
     * Get all orders with pagination, status filter, and search by user email
     */
    static async getAllOrders(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const status = req.query.status as string || '';
            const search = req.query.search as string || '';
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE 1=1';
            const params: any[] = [];
            let paramIndex = 1;

            if (status) {
                whereClause += ` AND o.status = $${paramIndex}`;
                params.push(status.toUpperCase());
                paramIndex++;
            }

            if (search) {
                whereClause += ` AND u.email ILIKE $${paramIndex}`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            const countQuery = `
                SELECT COUNT(*) FROM orders o
                JOIN users u ON o.user_id = u.id
                ${whereClause}
            `;
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].count);

            const ordersQuery = `
                SELECT o.id, o.user_id, o.total, o.status, o.payment_method, o.payment_status,
                       o.shipping_address_line1, o.shipping_city, o.shipping_state, o.shipping_postal_code,
                       o.created_at, o.updated_at,
                       u.full_name, u.email
                FROM orders o
                JOIN users u ON o.user_id = u.id
                ${whereClause}
                ORDER BY o.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            const ordersResult = await pool.query(ordersQuery, [...params, limit, offset]);

            res.status(200).json({
                success: true,
                data: {
                    orders: ordersResult.rows,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                },
            });
        } catch (error) {
            logger.error('Get all orders error', error);
            res.status(500).json({ success: false, message: 'Failed to fetch orders' });
        }
    }

    /**
     * PUT /api/admin/orders/:id/status
     * Update order status
     */
    static async updateOrderStatus(req: Request, res: Response): Promise<void> {
        try {
            const orderId = req.params.id as string;
            const { status } = req.body;

            // Must match DB CHECK constraint: PLACED, CONFIRMED, PREPARING, DISPATCHED, DELIVERED, CANCELLED, REFUNDED
            const validStatuses = ['PLACED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
            if (!status || !validStatuses.includes(status.toUpperCase())) {
                res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
                });
                return;
            }

            const normalizedStatus = status.toUpperCase();

            // Get current order status
            const currentOrder = await pool.query('SELECT status, payment_status FROM orders WHERE id = $1', [orderId]);

            if (currentOrder.rows.length === 0) {
                res.status(404).json({ success: false, message: 'Order not found' });
                return;
            }

            const currentStatus = currentOrder.rows[0].status;

            // Validate status transitions matching DB constraint values
            const allowedTransitions: Record<string, string[]> = {
                PLACED: ['CONFIRMED', 'CANCELLED'],
                CONFIRMED: ['PREPARING', 'CANCELLED'],
                PREPARING: ['DISPATCHED', 'CANCELLED'],
                DISPATCHED: ['DELIVERED'],
                DELIVERED: ['REFUNDED'],
                CANCELLED: [],
                REFUNDED: [],
            };

            if (!allowedTransitions[currentStatus]?.includes(normalizedStatus)) {
                res.status(400).json({
                    success: false,
                    message: `Cannot transition from ${currentStatus} to ${normalizedStatus}`,
                });
                return;
            }

            const query = `
                UPDATE orders
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING id, user_id, total, status, created_at, updated_at
            `;

            const result = await pool.query(query, [normalizedStatus, orderId]);

            const updatedOrder = result.rows[0];

            // Publish order status updated event via Redis Pub/Sub
            const authReq = req as AuthRequest;
            const adminId = authReq.user?.id;

            if (normalizedStatus === 'CANCELLED') {
                // Publish cancellation event
                publishEvent(CHANNELS.ORDER_CANCELLED, {
                    orderId: parseInt(orderId),
                    userId: updatedOrder.user_id,
                    cancelledBy: 'admin',
                    refundInitiated: false,
                    timestamp: new Date().toISOString(),
                }).catch(err => logger.error('Failed to publish ORDER_CANCELLED event:', err));
            } else {
                // Publish status update event
                publishEvent(CHANNELS.ORDER_STATUS_UPDATED, {
                    orderId: parseInt(orderId),
                    userId: updatedOrder.user_id,
                    oldStatus: currentStatus,
                    newStatus: normalizedStatus,
                    updatedBy: 'admin',
                    adminId,
                    timestamp: new Date().toISOString(),
                }).catch(err => logger.error('Failed to publish ORDER_STATUS_UPDATED event:', err));
            }

            // Restore stock when admin cancels an order
            if (normalizedStatus === 'CANCELLED') {
                const orderItems = await pool.query(
                    'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
                    [orderId]
                );
                for (const item of orderItems.rows) {
                    const updatedProduct = await pool.query(
                        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2 RETURNING stock_quantity',
                        [item.quantity, item.product_id]
                    );
                    // Trigger back-in-stock notifications
                    if (updatedProduct.rows[0]?.stock_quantity > 0) {
                        StockAlertService.checkAndNotify(item.product_id, updatedProduct.rows[0].stock_quantity).catch(() => {});
                    }
                }
                logger.info(`Stock restored for cancelled order ${orderId}`);
            }

            res.status(200).json({
                success: true,
                message: `Order status updated to ${normalizedStatus}`,
                data: updatedOrder,
            });
        } catch (error) {
            logger.error('Update order status error', error);
            res.status(500).json({ success: false, message: 'Failed to update order status' });
        }
    }

    /**
     * GET /api/admin/analytics/users
     * Get user analytics
     */
    static async getUserAnalytics(req: Request, res: Response): Promise<void> {
        try {
            const [totalResult, newUsersResult, topBuyersResult] = await Promise.all([
                pool.query(
                    `SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_this_week,
                        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
                     FROM users WHERE is_active = TRUE`
                ),
                pool.query(
                    `SELECT DATE(created_at) as date, COUNT(*) as count
                     FROM users
                     WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                     GROUP BY DATE(created_at)
                     ORDER BY date`
                ),
                pool.query(
                    `SELECT u.id, u.full_name, u.email, COUNT(o.id) as order_count, COALESCE(SUM(o.total), 0) as total_spent
                     FROM users u
                     LEFT JOIN orders o ON u.id = o.user_id AND o.status != 'CANCELLED'
                     WHERE u.is_active = TRUE
                     GROUP BY u.id, u.full_name, u.email
                     ORDER BY total_spent DESC
                     LIMIT 10`
                ),
            ]);

            res.status(200).json({
                success: true,
                data: {
                    summary: totalResult.rows[0],
                    newUsers: newUsersResult.rows,
                    topBuyers: topBuyersResult.rows,
                },
            });
        } catch (error) {
            logger.error('User analytics error', error);
            res.status(500).json({ success: false, message: 'Failed to fetch user analytics' });
        }
    }
}
