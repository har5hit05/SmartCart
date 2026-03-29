import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { CreateOrderDTO, UpdateOrderStatusDTO, OrderFilters } from '../types/Order';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../utils/logger';
import { InvoiceService } from '../services/invoice.service';

export class OrderController {
    /**
     * POST /api/orders
     * Create order from cart
     */
    static async createOrder(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const orderData: CreateOrderDTO = req.body;

            const order = await OrderService.createOrder(userId, orderData);

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: order,
            });
        } catch (error) {
            logger.error('Create order error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create order';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * GET /api/orders
     * Get user's orders
     */
    static async getUserOrders(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const filters: OrderFilters = {
                status: req.query.status as any,
                payment_status: req.query.payment_status as any,
                from_date: req.query.from_date as string,
                to_date: req.query.to_date as string,
            };

            const page = req.query.page ? parseInt(req.query.page as string) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

            const result = await OrderService.getUserOrders(userId, filters, page, limit);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error('Get user orders error', error);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
            });
        }
    }

    /**
     * GET /api/orders/:id
     * Get single order
     */
    static async getOrder(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;
            const isAdmin = authReq.user?.role === 'admin';

            const orderId = parseInt(req.params.id as string);

            if (isNaN(orderId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid order ID',
                });
                return;
            }

            // Admin can view any order, customer only their own
            const order = await OrderService.getOrderById(orderId, isAdmin ? undefined : userId);

            res.status(200).json({
                success: true,
                data: order,
            });
        } catch (error) {
            logger.error('Get order error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch order';

            res.status(404).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * GET /api/orders/all (Admin)
     * Get all orders
     */
    static async getAllOrders(req: Request, res: Response): Promise<void> {
        try {
            const filters: OrderFilters = {
                status: req.query.status as any,
                payment_status: req.query.payment_status as any,
                from_date: req.query.from_date as string,
                to_date: req.query.to_date as string,
            };

            const page = req.query.page ? parseInt(req.query.page as string) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

            const result = await OrderService.getAllOrders(filters, page, limit);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error('Get all orders error', error);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
            });
        }
    }

    /**
     * PUT /api/orders/:id/status (Admin)
     * Update order status
     */
    static async updateOrderStatus(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const adminId = authReq.user?.id;

            if (!adminId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const orderId = parseInt(req.params.id as string);

            if (isNaN(orderId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid order ID',
                });
                return;
            }

            const data: UpdateOrderStatusDTO = req.body;

            await OrderService.updateOrderStatus(orderId, data, adminId);

            res.status(200).json({
                success: true,
                message: 'Order status updated successfully',
            });
        } catch (error) {
            logger.error('Update order status error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update order status';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * POST /api/orders/:id/cancel
     * Cancel order (Customer)
     */
    static async cancelOrder(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const orderId = parseInt(req.params.id as string);

            if (isNaN(orderId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid order ID',
                });
                return;
            }

            await OrderService.cancelOrder(orderId, userId);

            res.status(200).json({
                success: true,
                message: 'Order cancelled successfully',
            });
        } catch (error) {
            logger.error('Cancel order error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to cancel order';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * GET /api/orders/:id/invoice
     * Download order invoice PDF
     */
    static async downloadInvoice(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;
            const isAdmin = authReq.user?.role === 'admin';

            if (!userId) {
                res.status(401).json({ success: false, message: 'Authentication required' });
                return;
            }

            const orderId = parseInt(req.params.id as string);
            if (isNaN(orderId)) {
                res.status(400).json({ success: false, message: 'Invalid order ID' });
                return;
            }

            const pdfBuffer = isAdmin
                ? await InvoiceService.generateInvoiceAdmin(orderId)
                : await InvoiceService.generateInvoice(orderId, userId);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=SmartCart-Invoice-${String(orderId).padStart(6, '0')}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.end(pdfBuffer);
        } catch (error) {
            logger.error('Download invoice error', error);
            res.status(404).json({ success: false, message: 'Order not found or invoice generation failed' });
        }
    }

    /**
     * GET /api/orders/:id/history
     * Get order status history
     */
    static async getOrderHistory(req: Request, res: Response): Promise<void> {
        try {
            const orderId = parseInt(req.params.id as string);

            if (isNaN(orderId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid order ID',
                });
                return;
            }

            const history = await OrderService.getOrderHistory(orderId);

            res.status(200).json({
                success: true,
                data: history,
            });
        } catch (error) {
            logger.error('Get order history error', error);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch order history',
            });
        }
    }
}