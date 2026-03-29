/**
 * Cash on Delivery (COD) Payment Provider
 *
 * No-op provider — creates a "virtual" payment that's always pending.
 * Payment is collected when the order is delivered.
 */

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

export class CODProvider implements PaymentProvider {
    readonly name = 'cod';

    async createOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult> {
        // No external API call — COD is handled at delivery
        const codOrderId = `cod_${params.receipt}_${Date.now()}`;

        logger.info(`COD order created: ${codOrderId}, amount: ${params.amount}`);

        return {
            provider: this.name,
            provider_order_id: codOrderId,
            amount: params.amount,
            currency: params.currency,
            status: 'created',
            client_data: {
                message: 'Cash on Delivery — pay when your order arrives',
            },
        };
    }

    async verifyPayment(_params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
        // COD is always "verified" at creation — actual payment happens at delivery
        return {
            verified: true,
            provider_payment_id: _params.provider_payment_id || _params.provider_order_id,
            provider_order_id: _params.provider_order_id,
            status: 'pending_delivery',
            amount: 0,
            method: 'cod',
        };
    }

    async handleWebhook(_payload: any, _signature: string): Promise<WebhookResult> {
        // COD has no webhooks
        return {
            event: 'cod.noop',
            status: 'no_webhook',
        };
    }

    async refund(_params: RefundParams): Promise<RefundResult> {
        // COD refund is manual (cash return or bank transfer by admin)
        logger.info(`COD refund initiated (manual process): ${_params.provider_payment_id}`);
        return {
            refund_id: `cod_refund_${Date.now()}`,
            status: 'manual_refund_required',
            amount: _params.amount,
        };
    }
}
