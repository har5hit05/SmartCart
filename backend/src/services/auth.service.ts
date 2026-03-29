import { UserModel } from '../models/User';
import { RefreshTokenModel } from '../models/RefreshToken';
import { CreateUserDTO, LoginDTO, AuthResponse } from '../types/User';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';

export class AuthService {
    /**
     * Register a new user
     */
    static async register(userData: CreateUserDTO): Promise<AuthResponse> {
        const { email, password, full_name } = userData;

        // Validate input
        if (!email || !password || !full_name) {
            throw new Error('Email, password, and full name are required');
        }

        // Validate email format
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }

        // Validate password strength
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Check if user already exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Create user
        const user = await UserModel.create({ email, password, full_name });

        logger.info(`New user registered: ${user.email}`);

        // Generate tokens
        const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const refreshToken = generateRefreshToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Store the JWT refresh token in database (for validation)
        await RefreshTokenModel.createWithToken(user.id, refreshToken);

        return {
            user: UserModel.toResponse(user),
            accessToken,
            refreshToken,
        };
    }

    /**
     * Login user
     */
    static async login(credentials: LoginDTO): Promise<AuthResponse> {
        const { email, password } = credentials;

        // Validate input
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Find user
        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if user is active
        if (!user.is_active) {
            throw new Error('Your account has been deactivated');
        }

        // Verify password
        if (!user.password_hash) {
            throw new Error('Please login with Google');
        }

        const isPasswordValid = await UserModel.verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        logger.info(`User logged in: ${user.email}`);

        // Generate tokens
        const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const refreshToken = generateRefreshToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Store the JWT refresh token in database
        await RefreshTokenModel.createWithToken(user.id, refreshToken);

        return {
            user: UserModel.toResponse(user),
            accessToken,
            refreshToken,
        };
    }

    /**
     * Refresh access token
     */
    static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }

        // Verify refresh token exists in database
        const tokenRecord = await RefreshTokenModel.findByToken(refreshToken);
        if (!tokenRecord) {
            throw new Error('Invalid or expired refresh token');
        }

        // Get user
        const user = await UserModel.findById(tokenRecord.user_id);
        if (!user || !user.is_active) {
            throw new Error('User not found or inactive');
        }

        // Generate new access token
        const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        logger.info(`Access token refreshed for user: ${user.email}`);

        return { accessToken };
    }

    /**
     * Logout user (invalidate refresh token)
     */
    static async logout(refreshToken: string): Promise<void> {
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }

        const deleted = await RefreshTokenModel.deleteByToken(refreshToken);
        if (!deleted) {
            throw new Error('Invalid refresh token');
        }

        logger.info('User logged out successfully');
    }

    /**
     * Logout from all devices
     */
    static async logoutAll(userId: number): Promise<void> {
        await RefreshTokenModel.deleteAllByUserId(userId);
        logger.info(`User ${userId} logged out from all devices`);
    }
}