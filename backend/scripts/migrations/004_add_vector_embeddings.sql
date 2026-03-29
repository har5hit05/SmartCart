-- Migration: Add vector embeddings for AI-powered semantic search
-- Version: 004
-- Date: 2026-03-23

-- Enable pgvector extension (already available in pgvector/pgvector docker image)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast similarity search (IVFFlat index)
-- Uses cosine distance for similarity comparison
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Function to find similar products by embedding
CREATE OR REPLACE FUNCTION find_similar_products(
    query_embedding vector(1536),
    match_count INT DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id INT,
    name VARCHAR,
    description TEXT,
    price DECIMAL,
    category VARCHAR,
    stock_quantity INT,
    image_url VARCHAR,
    is_active BOOLEAN,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.stock_quantity,
        p.image_url,
        p.is_active,
        1 - (p.embedding <=> query_embedding) AS similarity
    FROM products p
    WHERE p.is_active = TRUE
        AND p.embedding IS NOT NULL
        AND 1 - (p.embedding <=> query_embedding) > similarity_threshold
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get product recommendations based on a product's embedding
CREATE OR REPLACE FUNCTION get_product_recommendations(
    product_id_input INT,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id INT,
    name VARCHAR,
    description TEXT,
    price DECIMAL,
    category VARCHAR,
    image_url VARCHAR,
    similarity FLOAT
) AS $$
DECLARE
    product_embedding vector(1536);
BEGIN
    -- Get the embedding of the input product
    SELECT p.embedding INTO product_embedding
    FROM products p WHERE p.id = product_id_input;

    IF product_embedding IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.image_url,
        1 - (p.embedding <=> product_embedding) AS similarity
    FROM products p
    WHERE p.id != product_id_input
        AND p.is_active = TRUE
        AND p.embedding IS NOT NULL
    ORDER BY p.embedding <=> product_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

SELECT 'Vector embeddings migration completed' AS status;
