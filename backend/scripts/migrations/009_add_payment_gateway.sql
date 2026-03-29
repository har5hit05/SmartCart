-- Migration 009: Add payment gateway support
-- Adds pending_payments table + new payment columns to orders

-- Add new payment columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method_detail VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_id VARCHAR(255);

-- Create index on new columns
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider ON orders(payment_provider);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);

-- Pending payments table: stores order data while user completes payment
CREATE TABLE IF NOT EXISTS pending_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    payment_provider VARCHAR(50) NOT NULL,
    provider_order_id VARCHAR(255),
    order_data JSONB NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, completed, failed, expired
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ
);

-- Indexes for pending payments
CREATE INDEX IF NOT EXISTS idx_pending_payments_user_id ON pending_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_provider_order_id ON pending_payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_expires_at ON pending_payments(expires_at);

-- Clean up expired pending payments (can be called by the cleanup worker)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_payments()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE pending_payments
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
