/**
 * Razorpay Payment Provider
 *
 * Handles Indian payments: UPI, Cards, Net Banking, Wallets
 * Uses Razorpay Orders API + HMAC signature verification
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import {
    PaymentProvider,
    CreatePaymentOrderParams,
    PaymentOrderResult,
    VerifyPaymentParams,
    VerifyPaymentResult,
    RefundParams,
    RefundResult,
    WebhookResult,
} from './payment.interface';

export class RazorpayProvider implements PaymentProvider {
    readonly name = 'razorpay';
    private instance: Razorpay | null = null;

    private getInstance(): Razorpay {
        if (!this.instance) {
            if (!config.razorpay.keyId || !config.razorpay.keySecret ||
                config.razorpay.keyId === 'your-razorpay-key') {
                throw new Error('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
            }
            this.instance = new Razorpay({
                key_id: config.razorpay.keyId,
                key_secret: config.razorpay.keySecret,
            });
        }
        return this.instance;
    }

    async createOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult> {
        const razorpay = this.getInstance();

        const options = {
            amount: params.amount, // Already in paise
            currency: params.currency || 'INR',
            receipt: params.receipt,
            notes: params.notes || {},
        };

        logger.info(`Creating Razorpay order: ${params.receipt}, amount: ${params.amount} paise`);

        const order = await razorpay.orders.create(options);

        return {
            provider: this.name,
            provider_order_id: order.id,
            amount: order.amount as number,
            currency: order.currency,
            status: order.status,
            client_data: {
                key_id: config.razorpay.keyId,
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'SmartCart',
                description: `Order ${params.receipt}`,
                prefill: params.customer ? {
                    name: params.customer.name,
                    email: params.customer.email,
                    contact: params.customer.phone || '',
                } : {},
            },
        };
    }

    async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
        const { provider_order_id, provider_payment_id, provider_signature } = params;

        if (!provider_signature) {
            throw new Error('Razorpay signature is required for verification');
        }

        // HMAC SHA256 verification — the core security step
        const body = `${provider_order_id}|${provider_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', config.razorpay.keySecret)
            .update(body)
            .digest('hex');

        const verified = expectedSignature === provider_signature;

        if (!verified) {
            logger.warn(`Razorpay signature mismatch for order ${provider_order_id}`);
            throw new Error('Payment verification failed — invalid signature');
        }

        logger.info(`Razorpay payment verified: ${provider_payment_id}`);

        // Fetch payment details from Razorpay to get amount and method
        let amount = 0;
        let method = 'unknown';
        try {
            const razorpay = this.getInstance();
            const payment = await razorpay.payments.fetch(provider_payment_id);
            amount = payment.amount as number;
            method = payment.method as string;
        } catch (err) {
            logger.warn('Could not fetch Razorpay payment details, using order data');
        }

        return {
            verified: true,
            provider_payment_id,
            provider_order_id,
            status: 'captured',
            amount,
            method,
        };
    }

    async handleWebhook(payload: any, signature: string): Promise<WebhookResult> {
        // Verify webhook signature — REJECT if secret is not configured
        const webhookSecret = config.razorpay.webhookSecret;
        if (!webhookSecret) {
            logger.warn('Razorpay webhook secret not configured — rejecting webhook to prevent spoofing');
            throw new Error('Webhook secret not configured — cannot verify authenticity');
        }

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (expectedSignature !== signature) {
            throw new Error('Invalid webhook signature');
        }

        const event = payload.event;
        const paymentEntity = payload.payload?.payment?.entity;

        logger.info(`Razorpay webhook received: ${event}`);

        return {
            event,
            provider_order_id: paymentEntity?.order_id,
            provider_payment_id: paymentEntity?.id,
            status: paymentEntity?.status || 'unknown',
            amount: paymentEntity?.amount,
            metadata: paymentEntity?.notes,
        };
    }

    async refund(params: RefundParams): Promise<RefundResult> {
        const razorpay = this.getInstance();

        logger.info(`Initiating Razorpay refund for payment ${params.provider_payment_id}: ${params.amount} paise`);

        const refund = await razorpay.payments.refund(params.provider_payment_id, {
            amount: params.amount,
            notes: params.reason ? { reason: params.reason } : {},
        });

        return {
            refund_id: refund.id,
            status: refund.status as string,
            amount: refund.amount as number,
        };
    }
}
