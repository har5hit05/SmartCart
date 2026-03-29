import { pool } from '../config/database';
import { CartItem, CartItemWithProduct, AddToCartDTO } from '../types/Cart';

export class CartModel {
    /**
     * Add item to cart or update quantity if already exists
     */
    static async addItem(userId: number, data: AddToCartDTO): Promise<CartItem> {
        const { product_id, quantity } = data;

        const query = `
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, product_id)
            DO UPDATE SET quantity = cart_items.quantity + $3
            RETURNING *
        `;

        const result = await pool.query(query, [userId, product_id, quantity]);
        return result.rows[0];
    }

    /**
     * Get all cart items for a user with product details
     */
    static async getCartItems(userId: number): Promise<CartItemWithProduct[]> {
        const query = `
            SELECT 
                ci.*,
                p.id as product_id,
                p.name as product_name,
                p.description as product_description,
                p.price as product_price,
                p.category as product_category,
                p.stock_quantity as product_stock_quantity,
                p.image_url as product_image_url,
                p.is_active as product_is_active,
                (ci.quantity * p.price) as subtotal
            FROM cart_items ci
            INNER JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = $1
            ORDER BY ci.created_at DESC
        `;

        const result = await pool.query(query, [userId]);

        return result.rows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            product_id: row.product_id,
            quantity: row.quantity,
            created_at: row.created_at,
            updated_at: row.updated_at,
            product: {
                id: row.product_id,
                name: row.product_name,
                description: row.product_description,
                price: parseFloat(row.product_price),
                category: row.product_category,
                stock_quantity: row.product_stock_quantity,
                image_url: row.product_image_url,
                is_active: row.product_is_active,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            subtotal: parseFloat(row.subtotal),
        }));
    }

    /**
     * Update cart item quantity
     */
    static async updateQuantity(
        userId: number,
        productId: number,
        quantity: number
    ): Promise<CartItem | null> {
        const query = `
            UPDATE cart_items
            SET quantity = $3
            WHERE user_id = $1 AND product_id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [userId, productId, quantity]);
        return result.rows[0] || null;
    }

    /**
     * Remove item from cart
     */
    static async removeItem(userId: number, productId: number): Promise<boolean> {
        const query = `
            DELETE FROM cart_items
            WHERE user_id = $1 AND product_id = $2
        `;

        const result = await pool.query(query, [userId, productId]);
        return result.rowCount !== null && result.rowCount > 0;
    }

    /**
     * Clear entire cart for a user
     */
    static async clearCart(userId: number): Promise<boolean> {
        const query = 'DELETE FROM cart_items WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        return result.rowCount !== null && result.rowCount > 0;
    }

    /**
     * Get cart item count for a user
     */
    static async getItemCount(userId: number): Promise<number> {
        const query = `
            SELECT COALESCE(SUM(quantity), 0) as count
            FROM cart_items
            WHERE user_id = $1
        `;

        const result = await pool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    /**
     * Check if product is in user's cart
     */
    static async hasProduct(userId: number, productId: number): Promise<boolean> {
        const query = `
            SELECT 1 FROM cart_items
            WHERE user_id = $1 AND product_id = $2
        `;

        const result = await pool.query(query, [userId, productId]);
        return result.rows.length > 0;
    }

    /**
     * Get single cart item
     */
    static async getItem(userId: number, productId: number): Promise<CartItem | null> {
        const query = `
            SELECT * FROM cart_items
            WHERE user_id = $1 AND product_id = $2
        `;

        const result = await pool.query(query, [userId, productId]);
        return result.rows[0] || null;
    }
}