import { pool } from '../config/database';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: Date;
}

export class NotificationModel {
  /**
   * Create a notification for a user.
   */
  static async create(
    userId: number,
    type: string,
    title: string,
    message?: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, message || null, data ? JSON.stringify(data) : null]
    );
    return result.rows[0];
  }

  /**
   * Get notifications for a user (paginated, newest first).
   */
  static async getUserNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const offset = (page - 1) * limit;

    const [notifResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      ),
    ]);

    return {
      notifications: notifResult.rows,
      unreadCount: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Mark a notification as read.
   */
  static async markRead(notificationId: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Mark all notifications as read for a user.
   */
  static async markAllRead(userId: number): Promise<number> {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return result.rowCount ?? 0;
  }

  /**
   * Get unread count for a user.
   */
  static async getUnreadCount(userId: number): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}
