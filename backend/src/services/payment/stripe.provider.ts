/**
 * Stripe Payment Provider
 *
 * Handles international card payments via Stripe PaymentIntents API.
 * Uses client_secret for frontend confirmation + webhook for async verification.
 */

import Stripe from 'stripe';
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

export class StripeProvider implements PaymentProvider {
    readonly name = 'stripe';
    private instance: Stripe | null = null;

    private getInstance(): Stripe {
        if (!this.instance) {
            if (!config.stripe.secretKey || config.stripe.secretKey === 'your-stripe-secret-key') {
                throw new Error('Stripe credentials not configured. Set STRIPE_SECRET_KEY in .env');
            }
            this.instance = new Stripe(config.stripe.secretKey);
        }
        return this.instance;
    }

    async createOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult> {
        const stripe = this.getInstance();

        // Convert INR paise to the amount Stripe expects (already smallest unit)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: params.amount,
            currency: params.currency.toLowerCase(),
            metadata: {
                receipt: params.receipt,
                ...params.notes,
            },
            receipt_email: params.customer?.email,
            description: `SmartCart Order ${params.receipt}`,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        logger.info(`Created Stripe PaymentIntent: ${paymentIntent.id} for ${params.receipt}`);

        return {
            provider: this.name,
            provider_order_id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            client_data: {
                client_secret: paymentIntent.client_secret,
                publishable_key: config.stripe.publishableKey,
            },
        };
    }

    async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
        const stripe = this.getInstance();
        const { provider_order_id } = params;

        // Retrieve the PaymentIntent from Stripe to verify its status
        const paymentIntent = await stripe.paymentIntents.retrieve(provider_order_id);

        const verified = paymentIntent.status === 'succeeded';

        if (!verified) {
            logger.warn(`Stripe PaymentIntent ${provider_order_id} status: ${paymentIntent.status}`);
            throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
        }

        logger.info(`Stripe payment verified: ${paymentIntent.id}`);

        return {
            verified: true,
            provider_payment_id: paymentIntent.id,
            provider_order_id: paymentIntent.id,
            status: 'succeeded',
            amount: paymentIntent.amount,
            method: 'card',
        };
    }

    async handleWebhook(payload: any, signature: string): Promise<WebhookResult> {
        const stripe = this.getInstance();
        const webhookSecret = config.stripe.webhookSecret;

        // REJECT if webhook secret is not configured — prevents spoofed events
        if (!webhookSecret) {
            logger.warn('Stripe webhook secret not configured — rejecting webhook to prevent spoofing');
            throw new Error('Webhook secret not configured — cannot verify authenticity');
        }

        // Verify webhook signature
        const event: Stripe.Event = stripe.webhooks.constructEvent(
            payload,          // raw body
            signature,
            webhookSecret
        );

        logger.info(`Stripe webhook received: ${event.type}`);

        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        return {
            event: event.type,
            provider_order_id: paymentIntent.id,
            provider_payment_id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata as Record<string, any>,
        };
    }

    async refund(params: RefundParams): Promise<RefundResult> {
        const stripe = this.getInstance();

        logger.info(`Initiating Stripe refund for ${params.provider_payment_id}: ${params.amount}`);

        const refund = await stripe.refunds.create({
            payment_intent: params.provider_payment_id,
            amount: params.amount,
            reason: 'requested_by_customer',
        });

        return {
            refund_id: refund.id,
            status: refund.status || 'pending',
            amount: refund.amount,
        };
    }
}
