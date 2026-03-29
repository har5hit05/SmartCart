import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        full_name: string;
        role: 'customer' | 'admin';
        is_email_verified: boolean;
    };
}

/**
 * Authentication Middleware
 * Verifies JWT access token and attaches user to request
 */
export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({
                success: false,
                message: 'No authorization token provided',
            });
            return;
        }

        // Extract token (format: "Bearer TOKEN")
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Invalid authorization header format',
            });
            return;
        }

        // Verify token
        const decoded = verifyAccessToken(token);

        if (!decoded) {
            res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
            });
            return;
        }

        // Get user from database
        const user = await UserModel.findById(decoded.userId);

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        // Check if user is active
        if (!user.is_active) {
            res.status(403).json({
                success: false,
                message: 'Your account has been deactivated',
            });
            return;
        }

        // Attach user to request
        (req as AuthRequest).user = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_email_verified: user.is_email_verified,
        };

        next();
    } catch (error) {
        logger.error('Auth middleware error', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed',
        });
    }
}

/**
 * Admin Role Middleware
 * Must be used AFTER authMiddleware
 * Verifies user has admin role
 */
export function adminMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const user = (req as AuthRequest).user;

    if (!user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
        return;
    }

    if (user.role !== 'admin') {
        res.status(403).json({
            success: false,
            message: 'Admin access required',
        });
        return;
    }

    next();
}

/**
 * Optional Auth Middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export async function optionalAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            next();
            return;
        }

        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader;

        const decoded = verifyAccessToken(token);

        if (decoded) {
            const user = await UserModel.findById(decoded.userId);
            if (user && user.is_active) {
                (req as AuthRequest).user = {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    is_email_verified: user.is_email_verified,
                };
            }
        }

        next();
    } catch (error) {
        // Don't fail, just continue without user
        next();
    }
}