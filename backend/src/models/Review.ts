import { pool } from '../config/database';

export interface Review {
    id: number;
    user_id: number;
    product_id: number;
    rating: number;
    title: string | null;
    comment: string | null;
    is_verified_purchase: boolean;
    helpful_count: number;
    created_at: Date;
    updated_at: Date;
    user_name?: string;
}

export interface ReviewStats {
    average_rating: number;
    total_reviews: number;
    rating_distribution: { rating: number; count: number }[];
}

export class ReviewModel {
    static async create(userId: number, productId: number, rating: number, title?: string, comment?: string): Promise<Review> {
        // Check if user purchased this product
        const purchaseCheck = await pool.query(
            `SELECT 1 FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status NOT IN ('CANCELLED', 'REFUNDED')
             LIMIT 1`,
            [userId, productId]
        );
        const isVerified = purchaseCheck.rows.length > 0;

        const result = await pool.query(
            `INSERT INTO reviews (user_id, product_id, rating, title, comment, is_verified_purchase)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [userId, productId, rating, title || null, comment || null, isVerified]
        );
        return result.rows[0];
    }

    static async update(reviewId: number, userId: number, data: { rating?: number; title?: string; comment?: string }): Promise<Review | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (data.rating !== undefined) { fields.push(`rating = $${idx++}`); values.push(data.rating); }
        if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
        if (data.comment !== undefined) { fields.push(`comment = $${idx++}`); values.push(data.comment); }

        if (fields.length === 0) return null;
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(reviewId, userId);

        const result = await pool.query(
            `UPDATE reviews SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    static async delete(reviewId: number, userId: number): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM reviews WHERE id = $1 AND user_id = $2',
            [reviewId, userId]
        );
        return (result.rowCount ?? 0) > 0;
    }

    static async getByProduct(productId: number, page: number = 1, limit: number = 10, sortBy: string = 'newest'): Promise<{ reviews: Review[]; total: number }> {
        const offset = (page - 1) * limit;
        let orderBy = 'r.created_at DESC';
        if (sortBy === 'oldest') orderBy = 'r.created_at ASC';
        if (sortBy === 'highest') orderBy = 'r.rating DESC, r.created_at DESC';
        if (sortBy === 'lowest') orderBy = 'r.rating ASC, r.created_at DESC';
        if (sortBy === 'helpful') orderBy = 'r.helpful_count DESC, r.created_at DESC';

        const [reviewsResult, countResult] = await Promise.all([
            pool.query(
                `SELECT r.*, u.full_name as user_name
                 FROM reviews r JOIN users u ON u.id = r.user_id
                 WHERE r.product_id = $1
                 ORDER BY ${orderBy}
                 LIMIT $2 OFFSET $3`,
                [productId, limit, offset]
            ),
            pool.query('SELECT COUNT(*) FROM reviews WHERE product_id = $1', [productId])
        ]);

        return {
            reviews: reviewsResult.rows,
            total: parseInt(countResult.rows[0].count)
        };
    }

    static async getStats(productId: number): Promise<ReviewStats> {
        const [avgResult, distResult] = await Promise.all([
            pool.query(
                'SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = $1',
                [productId]
            ),
            pool.query(
                `SELECT rating, COUNT(*) as count FROM reviews WHERE product_id = $1 GROUP BY rating ORDER BY rating DESC`,
                [productId]
            )
        ]);

        const distribution = [5, 4, 3, 2, 1].map(r => {
            const found = distResult.rows.find((row: any) => row.rating === r);
            return { rating: r, count: found ? parseInt(found.count) : 0 };
        });

        return {
            average_rating: parseFloat(avgResult.rows[0].average_rating),
            total_reviews: parseInt(avgResult.rows[0].total_reviews),
            rating_distribution: distribution
        };
    }

    static async getUserReview(userId: number, productId: number): Promise<Review | null> {
        const result = await pool.query(
            'SELECT r.*, u.full_name as user_name FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.user_id = $1 AND r.product_id = $2',
            [userId, productId]
        );
        return result.rows[0] || null;
    }

    static async markHelpful(reviewId: number): Promise<void> {
        await pool.query('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1', [reviewId]);
    }
}
