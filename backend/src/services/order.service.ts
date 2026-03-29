import { OrderModel } from '../models/Order';
import { CartModel } from '../models/Cart';
import { ProductModel } from '../models/Product';
import { pool } from '../config/database';
import {
    CreateOrderDTO,
    UpdateOrderStatusDTO,
    OrderFilters,
    PaginatedOrders,
    OrderWithItems,
    OrderStatusHistory,
} from '../types/Order';
import { logger } from '../utils/logger';
import { StockAlertService } from './stockAlert.service';
import { publishEvent, CHANNELS } from './pubsub.service';

export class OrderService {
    /**
     * Create order from cart
     */
    static async createOrder(userId: number, orderData: CreateOrderDTO): Promise<OrderWithItems> {
        // Get cart items
        const cartItems = await CartModel.getCartItems(userId);

        if (cartItems.length === 0) {
            throw new Error('Cart is empty');
        }

        // Validate stock for all items
        for (const item of cartItems) {
            if (!item.product.is_active) {
                throw new Error(`Product ${item.product.name} is no longer available`);
            }

            const hasStock = await ProductModel.hasStock(item.product_id, item.quantity);
            if (!hasStock) {
                throw new Error(
                    `Insufficient stock for ${item.product.name}. Only ${item.product.stock_quantity} available`
                );
            }
        }

        // Calculate pricing
        const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
        const tax = subtotal * 0.18; // 18% GST
        const shipping_fee = subtotal > 500 ? 0 : 50; // Free shipping above ₹500
        const discount = 0; // Can be implemented later
        const total = subtotal + tax + shipping_fee - discount;

        const pricing = {
            subtotal: Math.round(subtotal * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            shipping_fee,
            discount,
            total: Math.round(total * 100) / 100,
        };

        // Create order
        const order = await OrderModel.create(userId, orderData, pricing);

        // Create initial status history entry
        await pool.query(
            'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
            [order.id, 'PLACED', 'Order placed by customer']
        );

        // Create order items
        const orderItems = cartItems.map((item) => ({
            product_id: item.product_id,
            product_name: item.product.name,
            product_description: item.product.description,
            product_image_url: item.product.image_url,
            unit_price: item.product.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
        }));

        const items = await OrderModel.createOrderItems(order.id, orderItems);

        // Reduce stock for each product
        for (const item of cartItems) {
            await ProductModel.updateStock(item.product_id, -item.quantity);
        }

        // Clear cart after successful order
        await CartModel.clearCart(userId);

        logger.info(`Order ${order.id} created for user ${userId}`);

        // Publish order created event via Redis Pub/Sub
        publishEvent(CHANNELS.ORDER_CREATED, {
            orderId: order.id,
            userId,
            total: pricing.total,
            itemCount: items.length,
            paymentMethod: orderData.payment_method || 'COD',
            timestamp: new Date().toISOString(),
        }).catch(err => logger.error('Failed to publish ORDER_CREATED event:', err));

        // Publish stock updated events for each item
        for (const item of cartItems) {
            const product = item.product;
            publishEvent(CHANNELS.STOCK_UPDATED, {
                productId: item.product_id,
                productName: product.name,
                oldQuantity: product.stock_quantity,
                newQuantity: product.stock_quantity - item.quantity,
                reason: 'order',
                timestamp: new Date().toISOString(),
            }).catch(err => logger.error('Failed to publish STOCK_UPDATED event:', err));
        }

        return {
            ...order,
            items,
        };
    }

    /**
     * Get user's orders
     */
    static async getUserOrders(
        userId: number,
        filters: OrderFilters = {},
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedOrders> {
        return await OrderModel.findByUserId(userId, filters, page, limit);
    }

    /**
     * Get single order
     */
    static async getOrderById(orderId: number, userId?: number): Promise<OrderWithItems> {
        const order = await OrderModel.findByIdWithItems(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // If userId provided, verify order belongs to user
        if (userId && order.user_id !== userId) {
            throw new Error('Unauthorized to view this order');
        }

        return order;
    }

    /**
     * Get all orders (Admin)
     */
    static async getAllOrders(
        filters: OrderFilters = {},
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedOrders> {
        return await OrderModel.findAll(filters, page, limit);
    }

    /**
     * Update order status (Admin)
     */
    static async updateOrderStatus(
        orderId: number,
        data: UpdateOrderStatusDTO,
        adminId: number
    ): Promise<void> {
        const order = await OrderModel.findById(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // Validate status transition
        this.validateStatusTransition(order.status, data.status);

        // Update status
        await OrderModel.updateStatus(orderId, data.status, data.notes, adminId);

        // Update additional fields if provided
        if (data.tracking_number || data.courier_name || data.estimated_delivery_date) {
            await OrderModel.update(orderId, {
                tracking_number: data.tracking_number,
                courier_name: data.courier_name,
                estimated_delivery_date: data.estimated_delivery_date
                    ? new Date(data.estimated_delivery_date)
                    : undefined,
            });
        }

        logger.info(`Order ${orderId} status updated to ${data.status} by admin ${adminId}`);

        // Publish order status updated event via Redis Pub/Sub
        publishEvent(CHANNELS.ORDER_STATUS_UPDATED, {
            orderId,
            userId: order.user_id,
            oldStatus: order.status,
            newStatus: data.status,
            updatedBy: 'admin',
            adminId,
            notes: data.notes,
            timestamp: new Date().toISOString(),
        }).catch(err => logger.error('Failed to publish ORDER_STATUS_UPDATED event:', err));
    }

    /**
     * Cancel order (Customer)
     */
    static async cancelOrder(orderId: number, userId: number): Promise<void> {
        const order = await OrderModel.findByIdWithItems(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // Verify order belongs to user
        if (order.user_id !== userId) {
            throw new Error('Unauthorized to cancel this order');
        }

        // Only allow cancellation for PLACED or CONFIRMED orders
        if (!['PLACED', 'CONFIRMED'].includes(order.status)) {
            throw new Error(`Cannot cancel order with status ${order.status}`);
        }

        // Cancel order
        await OrderModel.cancel(orderId, userId);

        // Restore stock for all items and check for back-in-stock notifications
        for (const item of order.items) {
            const updated = await ProductModel.updateStock(item.product_id, item.quantity);
            if (updated && updated.stock_quantity > 0) {
                StockAlertService.checkAndNotify(item.product_id, updated.stock_quantity).catch((err) => {
                    logger.error(`Failed to send back-in-stock notification for product ${item.product_id}`, err);
                });
            }
        }

        logger.info(`Order ${orderId} cancelled by user ${userId}`);

        // Publish order cancelled event via Redis Pub/Sub
        publishEvent(CHANNELS.ORDER_CANCELLED, {
            orderId,
            userId,
            cancelledBy: 'customer',
            refundInitiated: order.payment_status === 'COMPLETED',
            timestamp: new Date().toISOString(),
        }).catch(err => logger.error('Failed to publish ORDER_CANCELLED event:', err));
    }

    /**
     * Get order status history
     */
    static async getOrderHistory(orderId: number): Promise<OrderStatusHistory[]> {
        return await OrderModel.getStatusHistory(orderId);
    }

    /**
     * Validate status transition
     */
    private static validateStatusTransition(currentStatus: string, newStatus: string): void {
        const validTransitions: { [key: string]: string[] } = {
            PLACED: ['CONFIRMED', 'CANCELLED'],
            CONFIRMED: ['PREPARING', 'CANCELLED'],
            PREPARING: ['DISPATCHED'],
            DISPATCHED: ['DELIVERED'],
            DELIVERED: ['REFUNDED'],
            CANCELLED: [],
            REFUNDED: [],
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
            throw new Error(
                `Invalid status transition from ${currentStatus} to ${newStatus}`
            );
        }
    }
}