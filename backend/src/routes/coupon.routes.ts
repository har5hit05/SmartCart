import { Router } from 'express';
import { CouponController } from '../controllers/coupon.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Public/User routes
router.get('/available', CouponController.getAvailable);
router.post('/validate', authMiddleware, CouponController.validate);

// Admin routes
router.get('/admin', authMiddleware, adminMiddleware, CouponController.getAll);
router.post('/admin', authMiddleware, adminMiddleware, CouponController.create);
router.put('/admin/:id', authMiddleware, adminMiddleware, CouponController.update);
router.delete('/admin/:id', authMiddleware, adminMiddleware, CouponController.delete);

export default router;
