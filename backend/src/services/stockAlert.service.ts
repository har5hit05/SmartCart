/**
 * Stock Alert Service
 *
 * Handles back-in-stock notification logic:
 * 1. Users subscribe to out-of-stock products
 * 2. When stock is replenished, all subscribers are notified via WebSocket + in-app notification
 * 3. Alerts are auto-resolved after notification
 */

import { StockAlertModel } from '../models/StockAlert';
import { NotificationModel } from '../models/Notification';
import { ProductModel } from '../models/Product';
import { getIO } from './websocket.service';
import { logger } from '../utils/logger';

export class StockAlertService {
  /**
   * Subscribe a user to back-in-stock alerts.
   * Only allows subscription for out-of-stock (qty === 0) products.
   */
  static async subscribe(userId: number, productId: number) {
    const product = await ProductModel.findById(productId);
    if (!product) throw new Error('Product not found');
    if (!product.is_active) throw new Error('Product is not available');
    if (product.stock_quantity > 0) throw new Error('Product is already in stock');

    const alert = await StockAlertModel.subscribe(userId, productId);
    logger.info(`User ${userId} subscribed to stock alert for product ${productId}`);
    return alert;
  }

  /**
   * Unsubscribe a user from stock alerts.
   */
  static async unsubscribe(userId: number, productId: number) {
    const removed = await StockAlertModel.unsubscribe(userId, productId);
    if (!removed) throw new Error('No active alert found');
    return removed;
  }

  /**
   * Check subscription status.
   */
  static async isSubscribed(userId: number, productId: number) {
    return StockAlertModel.isSubscribed(userId, productId);
  }

  /**
   * Get all active alerts for a user.
   */
  static async getUserAlerts(userId: number) {
    return StockAlertModel.getUserAlerts(userId);
  }

  /**
   * ── CORE ──
   * Check and trigger notifications for a product when its stock changes.
   * Called after any stock increase (order cancellation, admin restock, etc.)
   *
   * @param productId - The product whose stock was updated
   * @param newStockQty - The new stock quantity after the update
   */
  static async checkAndNotify(productId: number, newStockQty: number): Promise<void> {
    // Only notify if stock went from 0 → >0
    if (newStockQty <= 0) return;

    const pendingCount = await StockAlertModel.getPendingCount(productId);
    if (pendingCount === 0) return;

    const product = await ProductModel.findById(productId);
    if (!product) return;

    // Get all subscribers
    const subscribers = await StockAlertModel.getPendingSubscribers(productId);

    const io = getIO();

    // Create in-app notification + WebSocket push for each subscriber
    for (const subscriber of subscribers) {
      try {
        // Create persistent notification
        await NotificationModel.create(
          subscriber.user_id,
          'back_in_stock',
          `${product.name} is back in stock!`,
          `Good news! "${product.name}" is now available with ${newStockQty} units in stock. Grab it before it's gone!`,
          {
            product_id: product.id,
            product_name: product.name,
            product_price: product.price,
            product_image_url: product.image_url,
            stock_quantity: newStockQty,
          }
        );

        // Push real-time WebSocket notification
        if (io) {
          io.to(`user:${subscriber.user_id}`).emit('notification:backInStock', {
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            productImage: product.image_url,
            stockQuantity: newStockQty,
            message: `"${product.name}" is back in stock!`,
            timestamp: new Date(),
          });
        }
      } catch (err) {
        logger.error(`Failed to notify user ${subscriber.user_id} for product ${productId}`, err);
      }
    }

    // Mark all alerts as notified
    const notifiedCount = await StockAlertModel.markNotified(productId);
    logger.info(`Back-in-stock: Notified ${notifiedCount} users for product ${productId} (${product.name})`);
  }
}
