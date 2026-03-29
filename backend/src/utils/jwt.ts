import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
    userId: number;
    email: string;
    role: 'customer' | 'admin';
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload as object, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn as any,
    });
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload as object, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn as any,
    });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): any {
    return jwt.decode(token);
}