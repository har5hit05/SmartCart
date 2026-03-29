import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { CreateUserDTO, LoginDTO } from '../types/User';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middlewares/auth.middleware';

export class AuthController {
    /**
     * POST /api/auth/register
     * Register a new user
     */
    static async register(req: Request, res: Response): Promise<void> {
        try {
            const userData: CreateUserDTO = req.body;

            const result = await AuthService.register(userData);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: result,
            });
        } catch (error) {
            logger.error('Registration error', error);

            const errorMessage = error instanceof Error ? error.message : 'Registration failed';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * POST /api/auth/login
     * Login user
     */
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const credentials: LoginDTO = req.body;

            const result = await AuthService.login(credentials);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            logger.error('Login error', error);

            const errorMessage = error instanceof Error ? error.message : 'Login failed';

            res.status(401).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * POST /api/auth/refresh
     * Refresh access token
     */
    static async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            const result = await AuthService.refreshAccessToken(refreshToken);

            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                data: result,
            });
        } catch (error) {
            logger.error('Token refresh error', error);

            const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';

            res.status(401).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * POST /api/auth/logout
     * Logout user (invalidate refresh token)
     */
    static async logout(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            await AuthService.logout(refreshToken);

            res.status(200).json({
                success: true,
                message: 'Logout successful',
            });
        } catch (error) {
            logger.error('Logout error', error);

            const errorMessage = error instanceof Error ? error.message : 'Logout failed';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * GET /api/auth/me
     * Get current user info (requires authentication)
     */
    static async getCurrentUser(req: Request, res: Response): Promise<void> {
        try {
            // User is already attached to req by auth middleware
            const authReq = req as AuthRequest;
            const user = authReq.user;

            if (!user) {
                res.status(401).json({
                    success: false,
                    message: 'Not authenticated',
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: user,
            });
        } catch (error) {
            logger.error('Get current user error', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get user information',
            });
        }
    }
}