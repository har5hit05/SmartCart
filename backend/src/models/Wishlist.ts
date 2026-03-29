import { pool } from '../config/database';

export interface WishlistItem {
    id: number;
    user_id: number;
    product_id: number;
    created_at: Date;
    name?: string;
    price?: number;
    image_url?: string;
    category?: string;
    stock_quantity?: number;
    is_active?: boolean;
    avg_rating?: number;
    review_count?: number;
}

export class WishlistModel {
    static async add(userId: number, productId: number): Promise<WishlistItem> {
        const result = await pool.query(
            'INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING RETURNING *',
            [userId, productId]
        );
        if (result.rows.length === 0) {
            // Already exists, return existing
            const existing = await pool.query(
                'SELECT * FROM wishlist WHERE user_id = $1 AND product_id = $2',
                [userId, productId]
            );
            return existing.rows[0];
        }
        return result.rows[0];
    }

    static async remove(userId: number, productId: number): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );
        return (result.rowCount ?? 0) > 0;
    }

    static async getAll(userId: number): Promise<WishlistItem[]> {
        const result = await pool.query(
            `SELECT w.*, p.name, p.price, p.image_url, p.category, p.stock_quantity, p.is_active, p.avg_rating, p.review_count
             FROM wishlist w
             JOIN products p ON p.id = w.product_id
             WHERE w.user_id = $1
             ORDER BY w.created_at DESC`,
            [userId]
        );
        return result.rows;
    }

    static async check(userId: number, productId: number): Promise<boolean> {
        const result = await pool.query(
            'SELECT 1 FROM wishlist WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );
        return result.rows.length > 0;
    }

    static async count(userId: number): Promise<number> {
        const result = await pool.query(
            'SELECT COUNT(*) FROM wishlist WHERE user_id = $1',
            [userId]
        );
        return parseInt(result.rows[0].count);
    }
}
