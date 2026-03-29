import { pool } from '../config/database';
import { User, CreateUserDTO, UserResponse } from '../types/User';
import bcrypt from 'bcryptjs';

export class UserModel {
    /**
     * Create a new user
     */
    static async create(userData: CreateUserDTO): Promise<User> {
        const { email, password, full_name } = userData;

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO users (email, password_hash, full_name)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [email, password_hash, full_name]);
        return result.rows[0];
    }

    /**
     * Find user by email
     */
    static async findByEmail(email: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);
        return result.rows[0] || null;
    }

    /**
     * Find user by ID
     */
    static async findById(id: number): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }

    /**
     * Find user by Google ID
     */
    static async findByGoogleId(googleId: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE google_id = $1';
        const result = await pool.query(query, [googleId]);
        return result.rows[0] || null;
    }

    /**
     * Verify user password
     */
    static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Update user
     */
    static async update(id: number, updates: Partial<User>): Promise<User | null> {
        const allowedFields = ['full_name', 'profile_picture', 'is_email_verified'];
        const fields = Object.keys(updates).filter(key => allowedFields.includes(key));

        if (fields.length === 0) {
            return this.findById(id);
        }

        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = fields.map(field => updates[field as keyof User]);

        const query = `
            UPDATE users
            SET ${setClause}
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [id, ...values]);
        return result.rows[0] || null;
    }

    /**
     * Convert User to UserResponse (remove sensitive fields)
     */
    static toResponse(user: User): UserResponse {
        return {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            profile_picture: user.profile_picture,
            role: user.role,
            is_email_verified: user.is_email_verified,
            created_at: user.created_at,
        };
    }

    /**
     * Create or update Google user
     */
    static async createOrUpdateGoogleUser(googleProfile: {
        googleId: string;
        email: string;
        full_name: string;
        profile_picture?: string;
    }): Promise<User> {
        const { googleId, email, full_name, profile_picture } = googleProfile;

        // Check if user exists with this Google ID
        let user = await this.findByGoogleId(googleId);

        if (user) {
            // Update existing user
            const query = `
                UPDATE users
                SET full_name = $1, profile_picture = $2, updated_at = CURRENT_TIMESTAMP
                WHERE google_id = $3
                RETURNING *
            `;
            const result = await pool.query(query, [full_name, profile_picture, googleId]);
            return result.rows[0];
        }

        // Check if user exists with this email
        user = await this.findByEmail(email);

        if (user) {
            // Link Google account to existing user
            const query = `
                UPDATE users
                SET google_id = $1, profile_picture = $2, is_email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE email = $3
                RETURNING *
            `;
            const result = await pool.query(query, [googleId, profile_picture, email]);
            return result.rows[0];
        }

        // Create new user
        const query = `
            INSERT INTO users (email, google_id, full_name, profile_picture, is_email_verified)
            VALUES ($1, $2, $3, $4, TRUE)
            RETURNING *
        `;
        const result = await pool.query(query, [email, googleId, full_name, profile_picture]);
        return result.rows[0];
    }
}