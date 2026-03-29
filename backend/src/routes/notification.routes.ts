import { Router } from 'express';
import { StockAlertController } from '../controllers/stockAlert.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Get notifications (paginated)
router.get('/', authMiddleware, StockAlertController.getNotifications);

// Get unread count
router.get('/unread-count', authMiddleware, StockAlertController.getUnreadCount);

// Mark all as read
router.put('/read-all', authMiddleware, StockAlertController.markAllRead);

// Mark single notification as read
router.put('/:id/read', authMiddleware, StockAlertController.markRead);

export default router;
