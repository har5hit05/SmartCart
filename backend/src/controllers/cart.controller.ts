import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { AddToCartDTO, UpdateCartItemDTO } from '../types/Cart';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../utils/logger';

export class CartController {
    /**
     * POST /api/cart
     * Add product to cart
     */
    static async addToCart(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const data: AddToCartDTO = req.body;

            await CartService.addToCart(userId, data);

            res.status(201).json({
                success: true,
                message: 'Product added to cart',
            });
        } catch (error) {
            logger.error('Add to cart error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to add to cart';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * GET /api/cart
     * Get user's cart
     */
    static async getCart(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const cart = await CartService.getCart(userId);

            res.status(200).json({
                success: true,
                data: cart,
            });
        } catch (error) {
            logger.error('Get cart error', error);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch cart',
            });
        }
    }

    /**
     * PUT /api/cart/:productId
     * Update cart item quantity
     */
    static async updateCartItem(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const productId = parseInt(req.params.productId as string);

            if (isNaN(productId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid product ID',
                });
                return;
            }

            const data: UpdateCartItemDTO = req.body;

            await CartService.updateCartItem(userId, productId, data);

            res.status(200).json({
                success: true,
                message: 'Cart item updated',
            });
        } catch (error) {
            logger.error('Update cart item error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update cart item';

            res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * DELETE /api/cart/:productId
     * Remove item from cart
     */
    static async removeFromCart(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const productId = parseInt(req.params.productId as string);

            if (isNaN(productId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid product ID',
                });
                return;
            }

            await CartService.removeFromCart(userId, productId);

            res.status(200).json({
                success: true,
                message: 'Item removed from cart',
            });
        } catch (error) {
            logger.error('Remove from cart error', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to remove item';

            res.status(404).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    /**
     * DELETE /api/cart
     * Clear entire cart
     */
    static async clearCart(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            await CartService.clearCart(userId);

            res.status(200).json({
                success: true,
                message: 'Cart cleared',
            });
        } catch (error) {
            logger.error('Clear cart error', error);

            res.status(500).json({
                success: false,
                message: 'Failed to clear cart',
            });
        }
    }

    /**
     * GET /api/cart/count
     * Get cart item count
     */
    static async getCartCount(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const count = await CartService.getCartCount(userId);

            res.status(200).json({
                success: true,
                data: { count },
            });
        } catch (error) {
            logger.error('Get cart count error', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get cart count',
            });
        }
    }
}