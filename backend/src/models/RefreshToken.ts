import { pool } from '../config/database';
import { RefreshToken } from '../types/User';
import crypto from 'crypto';

export class RefreshTokenModel {
    /**
     * Create a new refresh token with a provided token string (JWT)
     */
    static async createWithToken(userId: number, token: string, expiresInDays: number = 7): Promise<RefreshToken> {
        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const query = `
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [userId, token, expiresAt]);
        return result.rows[0];
    }

    /**
     * Create a new refresh token (with random token - legacy method)
     */
    static async create(userId: number, expiresInDays: number = 7): Promise<RefreshToken> {
        // Generate secure random token
        const token = crypto.randomBytes(64).toString('hex');

        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const query = `
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [userId, token, expiresAt]);
        return result.rows[0];
    }

    /**
     * Find refresh token by token string
     */
    static async findByToken(token: string): Promise<RefreshToken | null> {
        const query = `
            SELECT * FROM refresh_tokens
            WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
        `;
        const result = await pool.query(query, [token]);
        return result.rows[0] || null;
    }

    /**
     * Delete refresh token (logout)
     */
    static async deleteByToken(token: string): Promise<boolean> {
        const query = 'DELETE FROM refresh_tokens WHERE token = $1';
        const result = await pool.query(query, [token]);
        return result.rowCount !== null && result.rowCount > 0;
    }

    /**
     * Delete all refresh tokens for a user (logout from all devices)
     */
    static async deleteAllByUserId(userId: number): Promise<boolean> {
        const query = 'DELETE FROM refresh_tokens WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        return result.rowCount !== null && result.rowCount > 0;
    }

    /**
     * Delete expired tokens (cleanup job)
     */
    static async deleteExpired(): Promise<number> {
        const query = 'DELETE FROM refresh_tokens WHERE expires_at <= CURRENT_TIMESTAMP';
        const result = await pool.query(query);
        return result.rowCount || 0;
    }
}