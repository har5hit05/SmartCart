import { pool } from '../config/database';

export interface StockAlert {
  id: number;
  user_id: number;
  product_id: number;
  status: 'pending' | 'notified' | 'cancelled';
  notified_at: Date | null;
  created_at: Date;
}

export interface StockAlertWithProduct extends StockAlert {
  product_name: string;
  product_price: number;
  product_image_url: string | null;
  product_category: string;
  stock_quantity: number;
}

export class StockAlertModel {
  /**
   * Subscribe a user to back-in-stock alerts for a product.
   * Uses ON CONFLICT to reactivate cancelled subscriptions.
   */
  static async subscribe(userId: number, productId: number): Promise<StockAlert> {
    const result = await pool.query(
      `INSERT INTO stock_alerts (user_id, product_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET status = 'pending', notified_at = NULL, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, productId]
    );
    return result.rows[0];
  }

  /**
   * Unsubscribe a user from a product alert.
   */
  static async unsubscribe(userId: number, productId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE stock_alerts SET status = 'cancelled' WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if a user has an active (pending) alert for a product.
   */
  static async isSubscribed(userId: number, productId: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM stock_alerts WHERE user_id = $1 AND product_id = $2 AND status = 'pending'`,
      [userId, productId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get all active alerts for a user (with product details).
   */
  static async getUserAlerts(userId: number): Promise<StockAlertWithProduct[]> {
    const result = await pool.query(
      `SELECT sa.*,
              p.name AS product_name,
              p.price AS product_price,
              p.image_url AS product_image_url,
              p.category AS product_category,
              p.stock_quantity
       FROM stock_alerts sa
       JOIN products p ON p.id = sa.product_id
       WHERE sa.user_id = $1 AND sa.status = 'pending'
       ORDER BY sa.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get all pending subscribers for a product (to notify them).
   */
  static async getPendingSubscribers(productId: number): Promise<Array<{ user_id: number; email: string; full_name: string }>> {
    const result = await pool.query(
      `SELECT u.id AS user_id, u.email, u.full_name
       FROM stock_alerts sa
       JOIN users u ON u.id = sa.user_id
       WHERE sa.product_id = $1 AND sa.status = 'pending'`,
      [productId]
    );
    return result.rows;
  }

  /**
   * Mark all pending alerts for a product as notified.
   */
  static async markNotified(productId: number): Promise<number> {
    const result = await pool.query(
      `UPDATE stock_alerts
       SET status = 'notified', notified_at = CURRENT_TIMESTAMP
       WHERE product_id = $1 AND status = 'pending'`,
      [productId]
    );
    return result.rowCount ?? 0;
  }

  /**
   * Count pending alerts for a product.
   */
  static async getPendingCount(productId: number): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) FROM stock_alerts WHERE product_id = $1 AND status = 'pending'`,
      [productId]
    );
    return parseInt(result.rows[0].count);
  }
}
