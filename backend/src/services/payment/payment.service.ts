/**
 * Payment Service — Orchestrator
 *
 * Picks the correct payment provider based on payment_method,
 * coordinates the payment lifecycle (create → verify → refund),
 * and updates order records accordingly.
 */

import { config } from '../../config';
import { pool } from '../../config/database';
import { logger } from '../../utils/logger';
import { PaymentProvider, PaymentOrderResult, VerifyPaymentResult } from './payment.interface';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';
import { CODProvider } from './cod.provider';
import { OrderService } from '../order.service';
import { CartModel } from '../../models/Cart';
import { ProductModel } from '../../models/Product';
import { CouponModel } from '../../models/Coupon';
import { publishEvent, CHANNELS } from '../pubsub.service';

// Provider registry — add new providers here
const providers: Record<string, PaymentProvider> = {
    razorpay: new RazorpayProvider(),
    stripe: new StripeProvider(),
    cod: new CODProvider(),
};

// Map frontend payment_method values to provider names
const methodToProvider: Record<string, string> = {
    RAZORPAY: 'razorpay',
    UPI: 'razorpay',         // UPI goes through Razorpay in India
    CARD: 'stripe',          // International cards through Stripe
    WALLET: 'razorpay',      // Wallets through Razorpay
    NETBANKING: 'razorpay',  // Net banking through Razorpay
    COD: 'cod',
};

function getProvider(paymentMethod: string): PaymentProvider {
    const providerName = methodToProvider[paymentMethod.toUpperCase()];
    if (!providerName || !providers[providerName]) {
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
    return providers[providerName];
}

export class PaymentService {
    /**
     * Step 1: Initiate payment — creates a provider order/intent
     * Called BEFORE the SmartCart order is created (for online payments)
     */
    static async initiatePayment(
        userId: number,
        paymentMethod: string,
        orderData: {
            shipping_address_line1: string;
            shipping_address_line2?: string;
            shipping_city: string;
            shipping_state: string;
            shipping_postal_code: string;
            shipping_country?: string;
            shipping_phone: string;
            customer_notes?: string;
            coupon_id?: number;
            discount_amount?: number;
        },
        customer?: { name: string; email: string; phone?: string }
    ): Promise<PaymentOrderResult & { smartcart_order_id?: number }> {
        const provider = getProvider(paymentMethod);

        // Validate cart and calculate total (same logic as order creation)
        const cartItems = await CartModel.getCartItems(userId);
        if (cartItems.length === 0) {
            throw new Error('Cart is empty');
        }

        // Validate stock
        for (const item of cartItems) {
            if (!item.product.is_active) {
                throw new Error(`Product ${item.product.name} is no longer available`);
            }
            const hasStock = await ProductModel.hasStock(item.product_id, item.quantity);
            if (!hasStock) {
                throw new Error(`Insufficient stock for ${item.product.name}`);
            }
        }

        // Calculate total server-side (NEVER trust frontend discount_amount)
        const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
        const tax = subtotal * 0.18;
        const shipping_fee = subtotal > 500 ? 0 : 50;

        // Re-validate coupon server-side to prevent discount manipulation
        let discount = 0;
        if (orderData.coupon_id) {
            const couponResult = await pool.query(
                `SELECT code FROM coupons WHERE id = $1`,
                [orderData.coupon_id]
            );
            if (couponResult.rows.length > 0) {
                const validation = await CouponModel.validate(
                    couponResult.rows[0].code,
                    userId,
                    subtotal
                );
                if (validation.valid && validation.discount_amount) {
                    discount = validation.discount_amount;
                    // Override frontend's discount_amount with server-calculated value
                    orderData.discount_amount = discount;
                    logger.info(`Coupon ${couponResult.rows[0].code} validated server-side: discount ₹${discount}`);
                } else {
                    // Coupon is no longer valid — ignore discount, clear coupon
                    logger.warn(`Coupon ID ${orderData.coupon_id} failed server-side validation: ${validation.message}`);
                    orderData.coupon_id = undefined;
                    orderData.discount_amount = 0;
                }
            } else {
                // Coupon doesn't exist — ignore
                orderData.coupon_id = undefined;
                orderData.discount_amount = 0;
            }
        } else {
            // No coupon — force discount to 0 regardless of what frontend sent
            orderData.discount_amount = 0;
        }

        const total = Math.round((subtotal + tax + shipping_fee - discount) * 100) / 100;
        const amountInPaise = Math.round(total * 100); // Convert to smallest unit

        // For COD, create order immediately
        if (paymentMethod.toUpperCase() === 'COD') {
            const order = await OrderService.createOrder(userId, {
                ...orderData,
                payment_method: 'COD' as any,
            });

            const codResult = await provider.createOrder({
                amount: amountInPaise,
                currency: 'INR',
                receipt: `order_${order.id}`,
            });

            return {
                ...codResult,
                smartcart_order_id: order.id,
            };
        }

        // For online payments: create provider order first, SmartCart order after verification
        // Store pending order data in a temporary record
        const pendingOrder = await pool.query(
            `INSERT INTO pending_payments
             (user_id, payment_method, payment_provider, order_data, amount, created_at, expires_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '30 minutes')
             RETURNING id`,
            [
                userId,
                paymentMethod,
                provider.name,
                JSON.stringify({
                    ...orderData,
                    payment_method: paymentMethod,
                }),
                total,
            ]
        );

        const pendingId = pendingOrder.rows[0].id;

        const result = await provider.createOrder({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `pending_${pendingId}`,
            notes: {
                pending_id: String(pendingId),
                user_id: String(userId),
            },
            customer,
        });

        // Store provider order ID in pending record
        await pool.query(
            `UPDATE pending_payments SET provider_order_id = $1 WHERE id = $2`,
            [result.provider_order_id, pendingId]
        );

        return {
            ...result,
            client_data: {
                ...result.client_data,
                pending_id: pendingId,
            },
        };
    }

    /**
     * Step 2: Verify payment and create SmartCart order
     * Called after frontend checkout completes
     */
    static async verifyAndCreateOrder(
        userId: number,
        verificationData: {
            pending_id: number;
            provider_order_id: string;
            provider_payment_id: string;
            provider_signature?: string;
        }
    ): Promise<{ order_id: number; payment_status: string }> {
        // Get pending payment record
        const pendingResult = await pool.query(
            `SELECT * FROM pending_payments
             WHERE id = $1 AND user_id = $2 AND status = 'pending' AND expires_at > NOW()`,
            [verificationData.pending_id, userId]
        );

        if (pendingResult.rows.length === 0) {
            throw new Error('Payment session expired or not found. Please try again.');
        }

        const pending = pendingResult.rows[0];
        const provider = getProvider(pending.payment_method);

        // Verify payment with the provider
        let verification: VerifyPaymentResult;
        try {
            verification = await provider.verifyPayment({
                provider_order_id: verificationData.provider_order_id,
                provider_payment_id: verificationData.provider_payment_id,
                provider_signature: verificationData.provider_signature,
            });
        } catch (error) {
            // Mark pending payment as failed
            await pool.query(
                `UPDATE pending_payments SET status = 'failed' WHERE id = $1`,
                [verificationData.pending_id]
            );
            throw error;
        }

        if (!verification.verified) {
            await pool.query(
                `UPDATE pending_payments SET status = 'failed' WHERE id = $1`,
                [verificationData.pending_id]
            );
            throw new Error('Payment verification failed');
        }

        // Payment verified — create the actual SmartCart order
        const orderData = JSON.parse(pending.order_data);
        const order = await OrderService.createOrder(userId, orderData);

        // Update order with payment details
        await pool.query(
            `UPDATE orders SET
                payment_status = 'COMPLETED',
                payment_provider = $1,
                payment_id = $2,
                razorpay_order_id = $3,
                razorpay_payment_id = $4,
                razorpay_signature = $5,
                stripe_payment_intent_id = $6,
                payment_method_detail = $7
             WHERE id = $8`,
            [
                provider.name,
                verification.provider_payment_id,
                provider.name === 'razorpay' ? verificationData.provider_order_id : null,
                provider.name === 'razorpay' ? verificationData.provider_payment_id : null,
                provider.name === 'razorpay' ? verificationData.provider_signature : null,
                provider.name === 'stripe' ? verificationData.provider_order_id : null,
                verification.method || null,
                order.id,
            ]
        );

        // Mark pending payment as completed
        await pool.query(
            `UPDATE pending_payments SET status = 'completed', completed_at = NOW() WHERE id = $1`,
            [verificationData.pending_id]
        );

        // Update order status to CONFIRMED since payment is done
        await pool.query(
            `SELECT update_order_status($1, $2, $3, $4)`,
            [order.id, 'CONFIRMED', 'Payment received — order auto-confirmed', null]
        );

        logger.info(`Payment verified and order ${order.id} created for user ${userId}`);

        // Publish payment completed event via Redis Pub/Sub
        publishEvent(CHANNELS.PAYMENT_COMPLETED, {
            orderId: order.id,
            userId,
            provider: provider.name,
            amount: pending.amount,
            paymentId: verification.provider_payment_id,
            method: verification.method,
            timestamp: new Date().toISOString(),
        }).catch(err => logger.error('Failed to publish PAYMENT_COMPLETED event:', err));

        return {
            order_id: order.id,
            payment_status: 'COMPLETED',
        };
    }

    /**
     * Handle webhook events from payment providers
     */
    static async handleWebhook(
        providerName: string,
        payload: any,
        signature: string
    ): Promise<void> {
        const provider = providers[providerName];
        if (!provider) {
            throw new Error(`Unknown provider: ${providerName}`);
        }

        const result = await provider.handleWebhook(payload, signature);

        logger.info(`Webhook ${providerName}: ${result.event}, status: ${result.status}`);

        // Handle payment.captured / payment_intent.succeeded events
        // This is a SAFETY NET — if user closes browser after payment, webhook creates the order
        if (
            result.event === 'payment.captured' ||
            result.event === 'payment_intent.succeeded'
        ) {
            const pendingResult = await pool.query(
                `SELECT * FROM pending_payments WHERE provider_order_id = $1 AND status = 'pending'`,
                [result.provider_order_id]
            );

            if (pendingResult.rows.length > 0) {
                const pending = pendingResult.rows[0];
                logger.info(`Webhook safety net: auto-creating order for pending payment ${pending.id}`);

                try {
                    // Create the order that the frontend failed to create
                    const orderData = JSON.parse(pending.order_data);
                    const order = await OrderService.createOrder(pending.user_id, orderData);

                    // Update order with payment details
                    await pool.query(
                        `UPDATE orders SET
                            payment_status = 'COMPLETED',
                            payment_provider = $1,
                            payment_id = $2,
                            razorpay_order_id = $3,
                            razorpay_payment_id = $4,
                            stripe_payment_intent_id = $5,
                            payment_method_detail = $6
                         WHERE id = $7`,
                        [
                            providerName,
                            result.provider_payment_id,
                            providerName === 'razorpay' ? result.provider_order_id : null,
                            providerName === 'razorpay' ? result.provider_payment_id : null,
                            providerName === 'stripe' ? result.provider_order_id : null,
                            result.metadata?.method || null,
                            order.id,
                        ]
                    );

                    // Mark pending as completed
                    await pool.query(
                        `UPDATE pending_payments SET status = 'completed', completed_at = NOW() WHERE id = $1`,
                        [pending.id]
                    );

                    // Auto-confirm the order
                    await pool.query(
                        `SELECT update_order_status($1, $2, $3, $4)`,
                        [order.id, 'CONFIRMED', 'Payment received via webhook — order auto-confirmed', null]
                    );

                    logger.info(`Webhook safety net: Order ${order.id} created successfully for pending ${pending.id}`);
                } catch (err) {
                    logger.error(`Webhook safety net failed for pending ${pending.id}:`, err);
                    // Don't throw — webhook should still return 200 to avoid retries for non-retryable errors
                }
            }
        }

        // Handle payment.failed events
        if (
            result.event === 'payment.failed' ||
            result.event === 'payment_intent.payment_failed'
        ) {
            await pool.query(
                `UPDATE pending_payments SET status = 'failed' WHERE provider_order_id = $1`,
                [result.provider_order_id]
            );
        }
    }

    /**
     * Initiate refund for an order
     */
    static async refundOrder(orderId: number): Promise<{ refund_id: string; status: string }> {
        const orderResult = await pool.query(
            `SELECT * FROM orders WHERE id = $1`,
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            throw new Error('Order not found');
        }

        const order = orderResult.rows[0];

        if (order.payment_status !== 'COMPLETED') {
            throw new Error('Cannot refund — payment was not completed');
        }

        const providerName = order.payment_provider || methodToProvider[order.payment_method] || 'cod';
        const provider = providers[providerName];

        if (!provider) {
            throw new Error(`Unknown payment provider: ${providerName}`);
        }

        const paymentId = order.payment_id || order.razorpay_payment_id || order.stripe_payment_intent_id;
        if (!paymentId) {
            throw new Error('No payment ID found for refund');
        }

        const amountInPaise = Math.round(order.total * 100);

        const refund = await provider.refund({
            provider_payment_id: paymentId,
            amount: amountInPaise,
            reason: `Refund for order #${orderId}`,
        });

        // Update order payment status
        await pool.query(
            `UPDATE orders SET payment_status = 'REFUNDED', refund_id = $1 WHERE id = $2`,
            [refund.refund_id, orderId]
        );

        logger.info(`Refund initiated for order ${orderId}: ${refund.refund_id}`);

        return {
            refund_id: refund.refund_id,
            status: refund.status,
        };
    }

    /**
     * Get available payment methods (for frontend to show)
     */
    static getAvailablePaymentMethods(): Array<{
        method: string;
        label: string;
        provider: string;
        icon: string;
        available: boolean;
    }> {
        const razorpayConfigured = !!(
            config.razorpay.keyId &&
            config.razorpay.keyId !== 'your-razorpay-key'
        );
        const stripeConfigured = !!(
            config.stripe.secretKey &&
            config.stripe.secretKey !== 'your-stripe-secret-key'
        );

        return [
            {
                method: 'COD',
                label: 'Cash on Delivery',
                provider: 'cod',
                icon: 'banknote',
                available: true,
            },
            {
                method: 'UPI',
                label: 'UPI (GPay, PhonePe, Paytm)',
                provider: 'razorpay',
                icon: 'smartphone',
                available: razorpayConfigured,
            },
            {
                method: 'RAZORPAY',
                label: 'Razorpay (Cards, Net Banking, Wallets)',
                provider: 'razorpay',
                icon: 'credit-card',
                available: razorpayConfigured,
            },
            {
                method: 'CARD',
                label: 'International Cards (Visa, Mastercard)',
                provider: 'stripe',
                icon: 'credit-card',
                available: stripeConfigured,
            },
        ];
    }
}
