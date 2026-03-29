-- Migration: Create products table
-- Version: 002
-- Date: 2026-03-15

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    category VARCHAR(100) NOT NULL,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Search optimization
    search_vector tsvector
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update search vector
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector
CREATE TRIGGER products_search_vector_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

-- Insert sample products
INSERT INTO products (name, description, price, category, stock_quantity, image_url) VALUES
    ('Wireless Mouse', 'Ergonomic wireless mouse with 2.4GHz connectivity', 29.99, 'Electronics', 50, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'),
    ('Laptop Stand', 'Aluminum laptop stand with adjustable height', 49.99, 'Accessories', 30, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'),
    ('USB-C Cable', 'Braided USB-C to USB-A cable, 6ft', 12.99, 'Electronics', 100, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'),
    ('Notebook Set', 'Premium ruled notebooks, pack of 3', 19.99, 'Stationery', 75, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'),
    ('Desk Lamp', 'LED desk lamp with 3 brightness levels', 34.99, 'Home & Office', 40, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'),
    ('Coffee Mug', 'Ceramic coffee mug with lid, 16oz', 14.99, 'Kitchen', 60, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'),
    ('Backpack', 'Water-resistant laptop backpack, 15.6 inch', 59.99, 'Accessories', 25, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'),
    ('Phone Case', 'Silicone phone case with shock absorption', 16.99, 'Electronics', 80, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'),
    ('Pen Set', 'Ballpoint pen set, black ink, pack of 10', 9.99, 'Stationery', 120, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'),
    ('Water Bottle', 'Stainless steel insulated water bottle, 32oz', 24.99, 'Kitchen', 55, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46')
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'Products table created successfully' AS status;
SELECT COUNT(*) AS sample_products_count FROM products;