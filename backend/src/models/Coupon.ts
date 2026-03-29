import { pool } from '../config/database';

export interface Coupon {
    id: number;
    code: string;
    description?: string;
    discount_type: 'percentage' | 'flat';
    discount_value: number;
    min_order_value: number;
    max_discount?: number;
    usage_limit?: number;
    times_used: number;
    per_user_limit: number;
    is_active: boolean;
    starts_at: Date;
    expires_at?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface CouponValidation {
    valid: boolean;
    coupon?: Coupon;
    discount_amount?: number;
    message: string;
}

export class CouponModel {
    static async findByCode(code: string): Promise<Coupon | null> {
        const result = await pool.query('SELECT * FROM coupons WHERE code = $1', [code.toUpperCase()]);
        return result.rows[0] || null;
    }

    static async findById(id: number): Promise<Coupon | null> {
        const result = await pool.query('SELECT * FROM coupons WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    static async findAll(): Promise<Coupon[]> {
        const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
        return result.rows;
    }

    static async getActiveCoupons(): Promise<Coupon[]> {
        const result = await pool.query(
            `SELECT * FROM coupons
             WHERE is_active = TRUE
               AND (expires_at IS NULL OR expires_at > NOW())
               AND (starts_at IS NULL OR starts_at <= NOW())
               AND (usage_limit IS NULL OR times_used < usage_limit)
             ORDER BY created_at DESC`
        );
        return result.rows;
    }

    static async getUserUsageCount(couponId: number, userId: number): Promise<number> {
        const result = await pool.query(
            'SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = $1 AND user_id = $2',
            [couponId, userId]
        );
        return parseInt(result.rows[0].count);
    }

    static async validate(code: string, userId: number, orderTotal: number): Promise<CouponValidation> {
        const coupon = await this.findByCode(code);

        if (!coupon) {
            return { valid: false, message: 'Invalid coupon code' };
        }

        if (!coupon.is_active) {
            return { valid: false, message: 'This coupon is no longer active' };
        }

        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return { valid: false, message: 'This coupon has expired' };
        }

        if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
            return { valid: false, message: 'This coupon is not yet valid' };
        }

        if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
            return { valid: false, message: 'This coupon has reached its usage limit' };
        }

        const userUsage = await this.getUserUsageCount(coupon.id, userId);
        if (userUsage >= coupon.per_user_limit) {
            return { valid: false, message: 'You have already used this coupon the maximum number of times' };
        }

        if (orderTotal < Number(coupon.min_order_value)) {
            return { valid: false, message: `Minimum order value of Rs.${coupon.min_order_value} required` };
        }

        // Calculate discount
        let discount_amount: number;
        if (coupon.discount_type === 'percentage') {
            discount_amount = (orderTotal * Number(coupon.discount_value)) / 100;
            if (coupon.max_discount) {
                discount_amount = Math.min(discount_amount, Number(coupon.max_discount));
            }
        } else {
            discount_amount = Number(coupon.discount_value);
        }

        discount_amount = Math.min(discount_amount, orderTotal);
        discount_amount = Math.round(discount_amount * 100) / 100;

        return {
            valid: true,
            coupon,
            discount_amount,
            message: `Coupon applied! You save Rs.${discount_amount.toFixed(2)}`,
        };
    }

    static async recordUsage(couponId: number, userId: number, orderId: number, discountAmount: number): Promise<void> {
        await pool.query(
            'INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount) VALUES ($1, $2, $3, $4)',
            [couponId, userId, orderId, discountAmount]
        );
        await pool.query(
            'UPDATE coupons SET times_used = times_used + 1, updated_at = NOW() WHERE id = $1',
            [couponId]
        );
    }

    static async create(data: Partial<Coupon>): Promise<Coupon> {
        const result = await pool.query(
            `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, per_user_limit, is_active, starts_at, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                data.code?.toUpperCase(),
                data.description,
                data.discount_type,
                data.discount_value,
                data.min_order_value || 0,
                data.max_discount || null,
                data.usage_limit || null,
                data.per_user_limit || 1,
                data.is_active !== false,
                data.starts_at || new Date(),
                data.expires_at || null,
            ]
        );
        return result.rows[0];
    }

    static async update(id: number, data: Partial<Coupon>): Promise<Coupon | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (data.code !== undefined) { fields.push(`code = $${idx++}`); values.push(data.code.toUpperCase()); }
        if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
        if (data.discount_type !== undefined) { fields.push(`discount_type = $${idx++}`); values.push(data.discount_type); }
        if (data.discount_value !== undefined) { fields.push(`discount_value = $${idx++}`); values.push(data.discount_value); }
        if (data.min_order_value !== undefined) { fields.push(`min_order_value = $${idx++}`); values.push(data.min_order_value); }
        if (data.max_discount !== undefined) { fields.push(`max_discount = $${idx++}`); values.push(data.max_discount); }
        if (data.usage_limit !== undefined) { fields.push(`usage_limit = $${idx++}`); values.push(data.usage_limit); }
        if (data.per_user_limit !== undefined) { fields.push(`per_user_limit = $${idx++}`); values.push(data.per_user_limit); }
        if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }
        if (data.expires_at !== undefined) { fields.push(`expires_at = $${idx++}`); values.push(data.expires_at); }

        if (fields.length === 0) return this.findById(id);

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
            `UPDATE coupons SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    static async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
