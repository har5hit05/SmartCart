/**
 * Payment Routes
 *
 * POST /api/payments/initiate     - Initiate payment (auth required)
 * POST /api/payments/verify       - Verify payment & create order (auth required)
 * GET  /api/payments/methods      - Get available payment methods (public)
 * POST /api/payments/:orderId/refund - Refund payment (admin only)
 * POST /api/payments/webhook/razorpay - Razorpay webhook (no auth)
 * POST /api/payments/webhook/stripe   - Stripe webhook (no auth)
 */

import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Public
router.get('/methods', PaymentController.getPaymentMethods);

// Authenticated
router.post('/initiate', authMiddleware, PaymentController.initiatePayment);
router.post('/verify', authMiddleware, PaymentController.verifyPayment);

// Admin only
router.post('/:orderId/refund', authMiddleware, adminMiddleware, PaymentController.refundPayment);

// Webhooks (no auth — providers authenticate via signatures)
router.post('/webhook/razorpay', PaymentController.razorpayWebhook);
router.post('/webhook/stripe', PaymentController.stripeWebhook);

export default router;
