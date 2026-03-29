/**
 * Payment Provider Interface (Strategy Pattern)
 *
 * All payment providers (Razorpay, Stripe, COD) implement this interface.
 * To add a new gateway (PayPal, PhonePe, etc.), just create a new class
 * implementing this interface — zero changes to existing code.
 */

export interface CreatePaymentOrderParams {
    amount: number;           // Amount in smallest currency unit (paise for INR, cents for USD)
    currency: string;         // e.g., 'INR', 'USD'
    receipt: string;          // Unique receipt ID (e.g., order_123)
    notes?: Record<string, string>;
    customer?: {
        name: string;
        email: string;
        phone?: string;
    };
}

export interface PaymentOrderResult {
    provider: string;                   // 'razorpay' | 'stripe' | 'cod'
    provider_order_id: string;          // Razorpay order_id or Stripe PaymentIntent ID
    amount: number;
    currency: string;
    status: string;
    // Provider-specific data the frontend needs
    client_data: Record<string, any>;   // key_id for Razorpay, client_secret for Stripe
}

export interface VerifyPaymentParams {
    provider_order_id: string;
    provider_payment_id: string;
    provider_signature?: string;
    // Additional data providers may need
    [key: string]: any;
}

export interface VerifyPaymentResult {
    verified: boolean;
    provider_payment_id: string;
    provider_order_id: string;
    status: string;             // 'captured', 'succeeded', etc.
    amount: number;
    method?: string;            // 'upi', 'card', 'netbanking', 'wallet'
}

export interface RefundParams {
    provider_payment_id: string;
    amount: number;             // Amount to refund in smallest currency unit
    reason?: string;
}

export interface RefundResult {
    refund_id: string;
    status: string;
    amount: number;
}

export interface WebhookResult {
    event: string;              // 'payment.captured', 'payment_intent.succeeded', etc.
    provider_order_id?: string;
    provider_payment_id?: string;
    status: string;
    amount?: number;
    metadata?: Record<string, any>;
}

export interface PaymentProvider {
    readonly name: string;

    /** Create a payment order/intent on the provider's side */
    createOrder(params: CreatePaymentOrderParams): Promise<PaymentOrderResult>;

    /** Verify payment after frontend checkout completes */
    verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;

    /** Process webhook events from the provider */
    handleWebhook(payload: any, signature: string): Promise<WebhookResult>;

    /** Initiate a refund */
    refund(params: RefundParams): Promise<RefundResult>;
}
