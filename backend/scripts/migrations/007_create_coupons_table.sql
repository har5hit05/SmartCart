-- Coupon/Discount System
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    max_discount DECIMAL(10, 2),          -- Cap for percentage discounts
    usage_limit INTEGER,                   -- NULL = unlimited
    times_used INTEGER DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupon_usage (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id, coupon_id);

-- Add coupon fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Insert sample coupons
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, per_user_limit, is_active, expires_at) VALUES
('WELCOME10', 'Welcome offer - 10% off on first order', 'percentage', 10, 200, 100, NULL, 1, TRUE, '2027-12-31'),
('FLAT50', 'Flat Rs.50 off on orders above Rs.500', 'flat', 50, 500, NULL, 100, 3, TRUE, '2027-06-30'),
('SAVE20', 'Save 20% - Maximum Rs.200 off', 'percentage', 20, 300, 200, 50, 2, TRUE, '2027-03-31'),
('MEGA100', 'Mega offer - Flat Rs.100 off on Rs.1000+', 'flat', 100, 1000, NULL, 30, 1, TRUE, '2027-12-31'),
('NEWUSER', 'New user special - 15% off', 'percentage', 15, 0, 150, NULL, 1, TRUE, '2027-12-31')
ON CONFLICT (code) DO NOTHING;
