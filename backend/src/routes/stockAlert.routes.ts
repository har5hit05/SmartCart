import { Router } from 'express';
import { StockAlertController } from '../controllers/stockAlert.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// ─── Stock Alerts ──────────────────────────────────────────────

// Subscribe to back-in-stock alerts
router.post('/:productId/subscribe', authMiddleware, StockAlertController.subscribe);

// Unsubscribe from alerts
router.delete('/:productId/unsubscribe', authMiddleware, StockAlertController.unsubscribe);

// Check subscription status
router.get('/:productId/status', authMiddleware, StockAlertController.checkStatus);

// Get all my active alerts
router.get('/', authMiddleware, StockAlertController.getMyAlerts);

export default router;
