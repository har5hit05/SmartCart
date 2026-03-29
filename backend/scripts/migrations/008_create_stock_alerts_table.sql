-- ============================================================
-- Migration 008: Stock Alerts / Back-in-Stock Notifications
-- ============================================================
-- Allows users to subscribe to out-of-stock products and
-- get notified (WebSocket + in-app) when stock is replenished.

-- Stock alert subscriptions
CREATE TABLE IF NOT EXISTS stock_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    -- 'pending' = waiting for stock, 'notified' = user was notified, 'cancelled' = user unsubscribed
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'cancelled')),
    notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- One active alert per user per product
    UNIQUE(user_id, product_id)
);

-- Notification log for audit trail
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,          -- 'back_in_stock', 'low_stock', 'order_update', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,                          -- Extra payload (product_id, order_id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_alerts_user ON stock_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_pending ON stock_alerts(product_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
