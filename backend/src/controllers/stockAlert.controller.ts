import { Request, Response } from 'express';
import { StockAlertService } from '../services/stockAlert.service';
import { NotificationModel } from '../models/Notification';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../utils/logger';

export class StockAlertController {
  /**
   * POST /api/stock-alerts/:productId/subscribe
   * Subscribe to back-in-stock alerts for a product
   */
  static async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const productId = parseInt(req.params.productId as string);

      const alert = await StockAlertService.subscribe(authReq.user!.id, productId);

      res.status(201).json({
        success: true,
        message: 'You will be notified when this product is back in stock',
        data: alert,
      });
    } catch (error: any) {
      logger.error('Subscribe stock alert error', error);
      const status = error.message?.includes('not found') ? 404
        : error.message?.includes('already in stock') ? 400
        : 500;
      res.status(status).json({ success: false, message: error.message || 'Failed to subscribe' });
    }
  }

  /**
   * DELETE /api/stock-alerts/:productId/unsubscribe
   * Unsubscribe from stock alerts for a product
   */
  static async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const productId = parseInt(req.params.productId as string);

      await StockAlertService.unsubscribe(authReq.user!.id, productId);

      res.status(200).json({ success: true, message: 'Unsubscribed from stock alerts' });
    } catch (error: any) {
      logger.error('Unsubscribe stock alert error', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to unsubscribe' });
    }
  }

  /**
   * GET /api/stock-alerts/:productId/status
   * Check if user is subscribed to alerts for a product
   */
  static async checkStatus(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const productId = parseInt(req.params.productId as string);

      const subscribed = await StockAlertService.isSubscribed(authReq.user!.id, productId);

      res.status(200).json({ success: true, data: { subscribed } });
    } catch (error) {
      logger.error('Check stock alert status error', error);
      res.status(500).json({ success: false, message: 'Failed to check alert status' });
    }
  }

  /**
   * GET /api/stock-alerts
   * Get all active stock alerts for the current user
   */
  static async getMyAlerts(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const alerts = await StockAlertService.getUserAlerts(authReq.user!.id);

      res.status(200).json({ success: true, data: alerts });
    } catch (error) {
      logger.error('Get stock alerts error', error);
      res.status(500).json({ success: false, message: 'Failed to get alerts' });
    }
  }

  // ─── Notifications Endpoints ─────────────────────────────────

  /**
   * GET /api/notifications
   * Get user's notifications (paginated)
   */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await NotificationModel.getUserNotifications(authReq.user!.id, page, limit);

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Get notifications error', error);
      res.status(500).json({ success: false, message: 'Failed to get notifications' });
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const count = await NotificationModel.getUnreadCount(authReq.user!.id);

      res.status(200).json({ success: true, data: { count } });
    } catch (error) {
      logger.error('Get unread count error', error);
      res.status(500).json({ success: false, message: 'Failed to get unread count' });
    }
  }

  /**
   * PUT /api/notifications/:id/read
   * Mark a notification as read
   */
  static async markRead(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const notificationId = parseInt(req.params.id as string);

      await NotificationModel.markRead(notificationId, authReq.user!.id);

      res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      logger.error('Mark notification read error', error);
      res.status(500).json({ success: false, message: 'Failed to mark as read' });
    }
  }

  /**
   * PUT /api/notifications/read-all
   * Mark all notifications as read
   */
  static async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const count = await NotificationModel.markAllRead(authReq.user!.id);

      res.status(200).json({ success: true, message: `${count} notifications marked as read` });
    } catch (error) {
      logger.error('Mark all read error', error);
      res.status(500).json({ success: false, message: 'Failed to mark all as read' });
    }
  }
}
