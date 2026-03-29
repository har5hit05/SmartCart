/**
 * Payment Controller
 *
 * Handles payment initiation, verification, webhooks, and refunds.
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { PaymentService } from '../services/payment/payment.service';
import { logger } from '../utils/logger';

export class PaymentController {
    /**
     * POST /api/payments/initiate
     * Create a payment order/intent with the selected provider
     */
    static async initiatePayment(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({ success: false, message: 'Authentication required' });
                return;
            }

            const { payment_method, ...orderData } = req.body;

            if (!payment_method) {
                res.status(400).json({ success: false, message: 'Payment method is required' });
                return;
            }

            const result = await PaymentService.initiatePayment(
                userId,
                payment_method,
                orderData,
                authReq.user ? {
                    name: authReq.user.full_name || authReq.user.email,
                    email: authReq.user.email,
                    phone: orderData.shipping_phone,
                } : undefined
            );

            res.status(200).json({
                success: true,
                message: payment_method === 'COD'
                    ? 'Order placed successfully'
                    : 'Payment initiated — complete checkout',
                data: result,
            });
        } catch (error) {
            logger.error('Payment initiation error', error);
            const message = error instanceof Error ? error.message : 'Payment initiation failed';
            res.status(400).json({ success: false, message });
        }
    }

    /**
     * POST /api/payments/verify
     * Verify payment after frontend checkout and create order
     */
    static async verifyPayment(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({ success: false, message: 'Authentication required' });
                return;
            }

            const { pending_id, provider_order_id, provider_payment_id, provider_signature } = req.body;

            if (!pending_id || !provider_order_id || !provider_payment_id) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required verification data (pending_id, provider_order_id, provider_payment_id)',
                });
                return;
            }

            // Razorpay requires signature for HMAC verification — reject early with clear message
            if (!provider_signature) {
                // Check if this pending payment uses Razorpay (which needs signature)
                const pendingCheck = await import('../config/database').then(m =>
                    m.pool.query(
                        `SELECT payment_provider FROM pending_payments WHERE id = $1`,
                        [pending_id]
                    )
                );
                if (pendingCheck.rows.length > 0 && pendingCheck.rows[0].payment_provider === 'razorpay') {
                    res.status(400).json({
                        success: false,
                        message: 'Razorpay signature is required for payment verification',
                    });
                    return;
                }
            }

            const result = await PaymentService.verifyAndCreateOrder(userId, {
                pending_id,
                provider_order_id,
                provider_payment_id,
                provider_signature,
            });

            res.status(200).json({
                success: true,
                message: 'Payment verified — order created',
                data: result,
            });
        } catch (error) {
            logger.error('Payment verification error', error);
            const message = error instanceof Error ? error.message : 'Payment verification failed';
            res.status(400).json({ success: false, message });
        }
    }

    /**
     * POST /api/payments/webhook/razorpay
     * Handle Razorpay webhook events
     */
    static async razorpayWebhook(req: Request, res: Response): Promise<void> {
        try {
            const signature = req.headers['x-razorpay-signature'] as string || '';
            await PaymentService.handleWebhook('razorpay', req.body, signature);
            res.status(200).json({ status: 'ok' });
        } catch (error) {
            logger.error('Razorpay webhook error', error);
            res.status(400).json({ status: 'error' });
        }
    }

    /**
     * POST /api/payments/webhook/stripe
     * Handle Stripe webhook events
     * Note: Stripe needs raw body for signature verification
     */
    static async stripeWebhook(req: Request, res: Response): Promise<void> {
        try {
            const sigHeader = req.headers['stripe-signature'];
            const signature = Array.isArray(sigHeader) ? sigHeader[0] : (sigHeader || '');
            // req.body is raw buffer when using express.raw() middleware on this route
            await PaymentService.handleWebhook('stripe', req.body, signature);
            res.status(200).json({ received: true });
        } catch (error) {
            logger.error('Stripe webhook error', error);
            res.status(400).json({ status: 'error' });
        }
    }

    /**
     * POST /api/payments/:orderId/refund
     * Initiate refund for an order (Admin only)
     */
    static async refundPayment(req: Request, res: Response): Promise<void> {
        try {
            const orderId = parseInt(req.params.orderId as string);
            if (isNaN(orderId)) {
                res.status(400).json({ success: false, message: 'Invalid order ID' });
                return;
            }

            const result = await PaymentService.refundOrder(orderId);

            res.status(200).json({
                success: true,
                message: 'Refund initiated',
                data: result,
            });
        } catch (error) {
            logger.error('Refund error', error);
            const message = error instanceof Error ? error.message : 'Refund failed';
            res.status(400).json({ success: false, message });
        }
    }

    /**
     * GET /api/payments/methods
     * Get available payment methods
     */
    static async getPaymentMethods(_req: Request, res: Response): Promise<void> {
        const methods = PaymentService.getAvailablePaymentMethods();
        res.status(200).json({
            success: true,
            data: methods,
        });
    }
}
