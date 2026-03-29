-- Migration: Create cart and orders tables
-- Version: 003
-- Date: 2026-03-15

-- =====================================================
-- CART TABLES
-- =====================================================

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure user can't have duplicate products in cart
    UNIQUE(user_id, product_id)
);

-- Indexes for cart
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Trigger to auto-update cart items updated_at
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ORDERS TABLES
-- =====================================================

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Order status
    status VARCHAR(50) DEFAULT 'PLACED' CHECK (
        status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED')
    ),
    
    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10, 2) DEFAULT 0 CHECK (tax >= 0),
    shipping_fee DECIMAL(10, 2) DEFAULT 0 CHECK (shipping_fee >= 0),
    discount DECIMAL(10, 2) DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    
    -- Shipping address
    shipping_address_line1 VARCHAR(255) NOT NULL,
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100) NOT NULL,
    shipping_state VARCHAR(100) NOT NULL,
    shipping_postal_code VARCHAR(20) NOT NULL,
    shipping_country VARCHAR(100) DEFAULT 'India',
    
    -- Contact
    shipping_phone VARCHAR(20) NOT NULL,
    
    -- Payment
    payment_method VARCHAR(50) DEFAULT 'COD' CHECK (
        payment_method IN ('COD', 'RAZORPAY', 'CARD', 'UPI', 'WALLET')
    ),
    payment_status VARCHAR(50) DEFAULT 'PENDING' CHECK (
        payment_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')
    ),
    payment_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(255),
    
    -- Tracking
    tracking_number VARCHAR(100),
    courier_name VARCHAR(100),
    estimated_delivery_date DATE,
    
    -- Notes
    customer_notes TEXT,
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    dispatched_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    
    -- Product snapshot (in case product details change later)
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT,
    product_image_url VARCHAR(500),
    
    -- Pricing at time of order
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Trigger to auto-update orders updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ORDER STATUS HISTORY (for tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(
    p_subtotal DECIMAL,
    p_tax DECIMAL,
    p_shipping_fee DECIMAL,
    p_discount DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN p_subtotal + COALESCE(p_tax, 0) + COALESCE(p_shipping_fee, 0) - COALESCE(p_discount, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update order status and create history entry
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id INTEGER,
    p_new_status VARCHAR,
    p_notes TEXT DEFAULT NULL,
    p_changed_by INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Update order status
    UPDATE orders
    SET status = p_new_status,
        confirmed_at = CASE WHEN p_new_status = 'CONFIRMED' THEN CURRENT_TIMESTAMP ELSE confirmed_at END,
        dispatched_at = CASE WHEN p_new_status = 'DISPATCHED' THEN CURRENT_TIMESTAMP ELSE dispatched_at END,
        delivered_at = CASE WHEN p_new_status = 'DELIVERED' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
        cancelled_at = CASE WHEN p_new_status = 'CANCELLED' THEN CURRENT_TIMESTAMP ELSE cancelled_at END
    WHERE id = p_order_id;
    
    -- Create history entry
    INSERT INTO order_status_history (order_id, status, notes, changed_by)
    VALUES (p_order_id, p_new_status, p_notes, p_changed_by);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (Optional)
-- =====================================================

-- Note: We won't insert sample orders as they're user-specific
-- Cart items will be created when users add products to cart

-- Verify
SELECT 'Cart and Orders tables created successfully' AS status;