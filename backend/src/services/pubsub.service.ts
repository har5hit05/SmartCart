/**
 * Redis Pub/Sub Event Service
 *
 * Centralized event bus using Redis Pub/Sub for real-time communication.
 * Decouples event producers (services) from consumers (WebSocket, notifications, analytics).
 *
 * Architecture:
 *   Service (e.g., OrderService)
 *     → publishes event to Redis channel
 *       → PubSub subscriber picks it up
 *         → broadcasts via Socket.io to relevant users
 *         → creates in-app notifications
 *         → triggers any side effects (analytics, email queue, etc.)
 *
 * Why Redis Pub/Sub instead of direct Socket.io emit?
 * 1. Decoupling: Services don't need to know about WebSocket/notification logic
 * 2. Scalability: Works across multiple server instances (horizontal scaling)
 * 3. Reliability: Events are processed even if Socket.io connection is temporarily down
 * 4. Extensibility: New subscribers can be added without modifying publishers
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getIO } from './websocket.service';
import { NotificationModel } from '../models/Notification';

// ─── Event Channel Definitions ───────────────────────────────────────────────

export const CHANNELS = {
    ORDER_CREATED: 'events:order:created',
    ORDER_STATUS_UPDATED: 'events:order:statusUpdated',
    ORDER_CANCELLED: 'events:order:cancelled',
    PAYMENT_COMPLETED: 'events:payment:completed',
    PAYMENT_FAILED: 'events:payment:failed',
    STOCK_UPDATED: 'events:stock:updated',
    STOCK_LOW: 'events:stock:low',
    PRODUCT_CREATED: 'events:product:created',
    PRODUCT_UPDATED: 'events:product:updated',
    USER_REGISTERED: 'events:user:registered',
    REVIEW_CREATED: 'events:review:created',
} as const;

export type ChannelName = typeof CHANNELS[keyof typeof CHANNELS];

// ─── Event Payload Types ─────────────────────────────────────────────────────

export interface OrderCreatedEvent {
    orderId: number;
    userId: number;
    total: number;
    itemCount: number;
    paymentMethod: string;
    timestamp: string;
}

export interface OrderStatusUpdatedEvent {
    orderId: number;
    userId: number;
    oldStatus: string;
    newStatus: string;
    updatedBy: 'admin' | 'system' | 'customer';
    adminId?: number;
    notes?: string;
    timestamp: string;
}

export interface OrderCancelledEvent {
    orderId: number;
    userId: number;
    cancelledBy: 'admin' | 'customer';
    reason?: string;
    refundInitiated: boolean;
    timestamp: string;
}

export interface PaymentCompletedEvent {
    orderId: number;
    userId: number;
    provider: string;
    amount: number;
    paymentId: string;
    method?: string;
    timestamp: string;
}

export interface PaymentFailedEvent {
    userId: number;
    provider: string;
    amount: number;
    error: string;
    timestamp: string;
}

export interface StockUpdatedEvent {
    productId: number;
    productName: string;
    oldQuantity: number;
    newQuantity: number;
    reason: 'order' | 'cancellation' | 'admin_restock' | 'adjustment';
    timestamp: string;
}

export interface StockLowEvent {
    productId: number;
    productName: string;
    currentQuantity: number;
    threshold: number;
    timestamp: string;
}

export interface ProductCreatedEvent {
    productId: number;
    productName: string;
    category: string;
    price: number;
    adminId: number;
    timestamp: string;
}

export interface ProductUpdatedEvent {
    productId: number;
    productName: string;
    changes: string[];
    adminId: number;
    timestamp: string;
}

export interface ReviewCreatedEvent {
    reviewId: number;
    productId: number;
    productName: string;
    userId: number;
    rating: number;
    timestamp: string;
}

// ─── Pub/Sub Service ─────────────────────────────────────────────────────────

// Redis requires SEPARATE clients for publish and subscribe
let publisherClient: RedisClientType | null = null;
let subscriberClient: RedisClientType | null = null;
let isInitialized = false;

const LOW_STOCK_THRESHOLD = 5; // Notify admin when stock falls below this

/**
 * Create a Redis client for Pub/Sub (separate from the cache client)
 */
function createPubSubClient(role: string): RedisClientType {
    const redisUrl = process.env.REDIS_URL;
    const client = createClient({
        ...(redisUrl ? { url: redisUrl } : {}),
        socket: {
            ...(redisUrl ? {} : { host: config.redis.host, port: config.redis.port }),
            reconnectStrategy: (retries) => {
                if (retries > 5) {
                    logger.warn(`Redis PubSub (${role}): Max reconnection attempts reached`);
                    return false;
                }
                return Math.min(retries * 500, 5000);
            },
        },
    });

    client.on('error', (err) => {
        logger.warn(`Redis PubSub (${role}) error:`, err.message);
    });

    client.on('connect', () => {
        logger.info(`Redis PubSub (${role}) connected`);
    });

    return client as RedisClientType;
}

/**
 * Initialize Redis Pub/Sub — creates publisher + subscriber clients,
 * registers all event handlers.
 */
export async function initializePubSub(): Promise<void> {
    if (isInitialized) return;

    try {
        // Create dedicated publisher and subscriber clients
        publisherClient = createPubSubClient('publisher');
        subscriberClient = createPubSubClient('subscriber');

        await Promise.all([
            publisherClient.connect(),
            subscriberClient.connect(),
        ]);

        // Register all event subscribers
        await registerSubscribers();

        isInitialized = true;
        logger.info('Redis Pub/Sub initialized with all event channels');
    } catch (error) {
        logger.warn('Redis Pub/Sub unavailable — real-time events will use direct Socket.io fallback');
        publisherClient = null;
        subscriberClient = null;
        isInitialized = false;
    }
}

/**
 * Publish an event to a Redis channel.
 * Falls back to direct Socket.io emit if Redis is unavailable.
 */
export async function publishEvent<T>(channel: ChannelName, data: T): Promise<void> {
    const payload = JSON.stringify(data);

    if (publisherClient) {
        try {
            await publisherClient.publish(channel, payload);
            logger.debug(`PubSub published → ${channel}`);
            return;
        } catch (error) {
            logger.warn(`PubSub publish failed for ${channel}, using direct fallback`);
        }
    }

    // Fallback: process event directly (no Redis)
    handleEventDirectly(channel, payload);
}

/**
 * Direct event processing fallback when Redis is unavailable.
 * Ensures the app works without Redis, just like the rest of our graceful fallbacks.
 */
function handleEventDirectly(channel: string, payload: string): void {
    try {
        const data = JSON.parse(payload);
        const handler = eventHandlers[channel];
        if (handler) {
            handler(data);
        }
    } catch (err) {
        logger.error(`Direct event handler failed for ${channel}:`, err);
    }
}

// ─── Event Handlers (Subscribers) ────────────────────────────────────────────

type EventHandler = (data: any) => void;

const eventHandlers: Record<string, EventHandler> = {
    /**
     * ORDER CREATED → Notify admin dashboard in real-time
     */
    [CHANNELS.ORDER_CREATED]: (data: OrderCreatedEvent) => {
        const io = getIO();
        if (!io) return;

        // Notify all admins about new order
        io.to('admin').emit('order:new', {
            orderId: data.orderId,
            userId: data.userId,
            total: data.total,
            itemCount: data.itemCount,
            paymentMethod: data.paymentMethod,
            timestamp: data.timestamp,
        });

        // Confirm to the user their order was received
        io.to(`user:${data.userId}`).emit('order:confirmed', {
            orderId: data.orderId,
            message: `Your order #${data.orderId} has been placed successfully!`,
            timestamp: data.timestamp,
        });

        logger.info(`PubSub [ORDER_CREATED]: Order #${data.orderId} — notified admin + user ${data.userId}`);
    },

    /**
     * ORDER STATUS UPDATED → Notify customer + update admin dashboard
     */
    [CHANNELS.ORDER_STATUS_UPDATED]: async (data: OrderStatusUpdatedEvent) => {
        const io = getIO();

        // Create in-app notification for the customer
        const statusMessages: Record<string, string> = {
            CONFIRMED: 'Your order has been confirmed and is being processed.',
            PREPARING: 'Your order is being prepared for shipment.',
            DISPATCHED: 'Your order has been dispatched! Track it from your orders page.',
            DELIVERED: 'Your order has been delivered. Enjoy your purchase!',
            REFUNDED: 'Your order refund has been processed.',
        };

        const message = statusMessages[data.newStatus] || `Your order status has been updated to ${data.newStatus}.`;

        try {
            await NotificationModel.create(
                data.userId,
                'order_status',
                `Order #${data.orderId} — ${data.newStatus}`,
                message,
                {
                    order_id: data.orderId,
                    old_status: data.oldStatus,
                    new_status: data.newStatus,
                }
            );
        } catch (err) {
            logger.error('Failed to create order status notification:', err);
        }

        // Real-time Socket.io push
        if (io) {
            io.to(`user:${data.userId}`).emit('order:statusUpdate', {
                orderId: data.orderId,
                oldStatus: data.oldStatus,
                newStatus: data.newStatus,
                message,
                timestamp: data.timestamp,
            });

            io.to('admin').emit('order:statusUpdate', {
                orderId: data.orderId,
                userId: data.userId,
                oldStatus: data.oldStatus,
                newStatus: data.newStatus,
                updatedBy: data.updatedBy,
                timestamp: data.timestamp,
            });

            // Push unread count update so NotificationBell refreshes
            try {
                const unreadCount = await NotificationModel.getUnreadCount(data.userId);
                io.to(`user:${data.userId}`).emit('notification:countUpdate', { count: unreadCount });
            } catch {}
        }

        logger.info(`PubSub [ORDER_STATUS_UPDATED]: Order #${data.orderId} → ${data.newStatus}`);
    },

    /**
     * ORDER CANCELLED → Notify customer + admin
     */
    [CHANNELS.ORDER_CANCELLED]: async (data: OrderCancelledEvent) => {
        const io = getIO();

        try {
            await NotificationModel.create(
                data.userId,
                'order_cancelled',
                `Order #${data.orderId} Cancelled`,
                data.refundInitiated
                    ? 'Your order has been cancelled. A refund will be processed within 5-7 business days.'
                    : 'Your order has been cancelled.',
                {
                    order_id: data.orderId,
                    cancelled_by: data.cancelledBy,
                    refund_initiated: data.refundInitiated,
                }
            );
        } catch (err) {
            logger.error('Failed to create cancellation notification:', err);
        }

        if (io) {
            io.to(`user:${data.userId}`).emit('order:cancelled', {
                orderId: data.orderId,
                refundInitiated: data.refundInitiated,
                timestamp: data.timestamp,
            });

            io.to('admin').emit('order:cancelled', {
                orderId: data.orderId,
                userId: data.userId,
                cancelledBy: data.cancelledBy,
                timestamp: data.timestamp,
            });

            try {
                const unreadCount = await NotificationModel.getUnreadCount(data.userId);
                io.to(`user:${data.userId}`).emit('notification:countUpdate', { count: unreadCount });
            } catch {}
        }

        logger.info(`PubSub [ORDER_CANCELLED]: Order #${data.orderId} by ${data.cancelledBy}`);
    },

    /**
     * PAYMENT COMPLETED → Notify customer
     */
    [CHANNELS.PAYMENT_COMPLETED]: async (data: PaymentCompletedEvent) => {
        const io = getIO();

        try {
            await NotificationModel.create(
                data.userId,
                'payment_success',
                `Payment Successful — ₹${data.amount.toFixed(2)}`,
                `Your payment of ₹${data.amount.toFixed(2)} via ${data.provider.toUpperCase()} has been confirmed for Order #${data.orderId}.`,
                {
                    order_id: data.orderId,
                    provider: data.provider,
                    payment_id: data.paymentId,
                    amount: data.amount,
                }
            );
        } catch (err) {
            logger.error('Failed to create payment notification:', err);
        }

        if (io) {
            io.to(`user:${data.userId}`).emit('payment:success', {
                orderId: data.orderId,
                amount: data.amount,
                provider: data.provider,
                timestamp: data.timestamp,
            });

            try {
                const unreadCount = await NotificationModel.getUnreadCount(data.userId);
                io.to(`user:${data.userId}`).emit('notification:countUpdate', { count: unreadCount });
            } catch {}
        }

        logger.info(`PubSub [PAYMENT_COMPLETED]: Order #${data.orderId} — ₹${data.amount} via ${data.provider}`);
    },

    /**
     * PAYMENT FAILED → Notify customer
     */
    [CHANNELS.PAYMENT_FAILED]: (data: PaymentFailedEvent) => {
        const io = getIO();
        if (!io) return;

        io.to(`user:${data.userId}`).emit('payment:failed', {
            amount: data.amount,
            provider: data.provider,
            error: data.error,
            timestamp: data.timestamp,
        });

        logger.info(`PubSub [PAYMENT_FAILED]: User ${data.userId} — ${data.provider} — ${data.error}`);
    },

    /**
     * STOCK UPDATED → Check for low stock, notify admin
     */
    [CHANNELS.STOCK_UPDATED]: (data: StockUpdatedEvent) => {
        const io = getIO();

        // Check if stock fell below threshold
        if (data.newQuantity > 0 && data.newQuantity <= LOW_STOCK_THRESHOLD && data.oldQuantity > LOW_STOCK_THRESHOLD) {
            // Publish low stock event
            publishEvent(CHANNELS.STOCK_LOW, {
                productId: data.productId,
                productName: data.productName,
                currentQuantity: data.newQuantity,
                threshold: LOW_STOCK_THRESHOLD,
                timestamp: new Date().toISOString(),
            } as StockLowEvent);
        }

        if (io) {
            // Update admin dashboard with real-time stock changes
            io.to('admin').emit('stock:updated', {
                productId: data.productId,
                productName: data.productName,
                oldQuantity: data.oldQuantity,
                newQuantity: data.newQuantity,
                reason: data.reason,
                timestamp: data.timestamp,
            });
        }

        logger.debug(`PubSub [STOCK_UPDATED]: ${data.productName} — ${data.oldQuantity} → ${data.newQuantity}`);
    },

    /**
     * STOCK LOW → Alert admins about low inventory
     */
    [CHANNELS.STOCK_LOW]: async (data: StockLowEvent) => {
        const io = getIO();

        if (io) {
            io.to('admin').emit('stock:low', {
                productId: data.productId,
                productName: data.productName,
                currentQuantity: data.currentQuantity,
                threshold: data.threshold,
                message: `⚠️ Low stock alert: "${data.productName}" has only ${data.currentQuantity} units left!`,
                timestamp: data.timestamp,
            });
        }

        logger.warn(`PubSub [STOCK_LOW]: "${data.productName}" — only ${data.currentQuantity} units remaining`);
    },

    /**
     * PRODUCT CREATED → Notify admin dashboard
     */
    [CHANNELS.PRODUCT_CREATED]: (data: ProductCreatedEvent) => {
        const io = getIO();
        if (!io) return;

        io.to('admin').emit('product:created', {
            productId: data.productId,
            productName: data.productName,
            category: data.category,
            price: data.price,
            timestamp: data.timestamp,
        });

        logger.info(`PubSub [PRODUCT_CREATED]: "${data.productName}" by admin ${data.adminId}`);
    },

    /**
     * PRODUCT UPDATED → Notify admin dashboard
     */
    [CHANNELS.PRODUCT_UPDATED]: (data: ProductUpdatedEvent) => {
        const io = getIO();
        if (!io) return;

        io.to('admin').emit('product:updated', {
            productId: data.productId,
            productName: data.productName,
            changes: data.changes,
            timestamp: data.timestamp,
        });

        logger.info(`PubSub [PRODUCT_UPDATED]: "${data.productName}" — ${data.changes.join(', ')}`);
    },

    /**
     * REVIEW CREATED → Notify admin about new review
     */
    [CHANNELS.REVIEW_CREATED]: (data: ReviewCreatedEvent) => {
        const io = getIO();
        if (!io) return;

        io.to('admin').emit('review:created', {
            reviewId: data.reviewId,
            productId: data.productId,
            productName: data.productName,
            rating: data.rating,
            timestamp: data.timestamp,
        });

        logger.info(`PubSub [REVIEW_CREATED]: ${data.rating}★ for "${data.productName}"`);
    },
};

/**
 * Register all subscribers on the Redis subscriber client
 */
async function registerSubscribers(): Promise<void> {
    if (!subscriberClient) return;

    const channels = Object.values(CHANNELS);

    for (const channel of channels) {
        await subscriberClient.subscribe(channel, (message) => {
            try {
                const data = JSON.parse(message);
                const handler = eventHandlers[channel];
                if (handler) {
                    handler(data);
                }
            } catch (err) {
                logger.error(`PubSub handler error on ${channel}:`, err);
            }
        });
    }

    logger.info(`PubSub subscribed to ${channels.length} channels: ${channels.map(c => c.replace('events:', '')).join(', ')}`);
}

/**
 * Graceful shutdown — close both Pub/Sub clients
 */
export async function closePubSub(): Promise<void> {
    try {
        if (subscriberClient) {
            await subscriberClient.unsubscribe();
            await subscriberClient.quit();
        }
        if (publisherClient) {
            await publisherClient.quit();
        }
        isInitialized = false;
        logger.info('Redis Pub/Sub closed');
    } catch (err) {
        logger.warn('Error closing Redis Pub/Sub:', err);
    }
}

/**
 * Check if Pub/Sub is currently active
 */
export function isPubSubActive(): boolean {
    return isInitialized;
}
