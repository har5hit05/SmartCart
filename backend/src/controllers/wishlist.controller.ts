import { Request, Response } from 'express';
import { WishlistModel } from '../models/Wishlist';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../utils/logger';

export class WishlistController {
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const items = await WishlistModel.getAll(authReq.user!.id);
            res.status(200).json({ success: true, data: items });
        } catch (error) {
            logger.error('Get wishlist error', error);
            res.status(500).json({ success: false, message: 'Failed to get wishlist' });
        }
    }

    static async add(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const { product_id } = req.body;
            const item = await WishlistModel.add(authReq.user!.id, product_id);
            res.status(201).json({ success: true, data: item });
        } catch (error) {
            logger.error('Add to wishlist error', error);
            res.status(500).json({ success: false, message: 'Failed to add to wishlist' });
        }
    }

    static async remove(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const productId = parseInt(req.params.productId as string);
            await WishlistModel.remove(authReq.user!.id, productId);
            res.status(200).json({ success: true, message: 'Removed from wishlist' });
        } catch (error) {
            logger.error('Remove from wishlist error', error);
            res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
        }
    }

    static async check(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const productId = parseInt(req.params.productId as string);
            const inWishlist = await WishlistModel.check(authReq.user!.id, productId);
            res.status(200).json({ success: true, data: { inWishlist } });
        } catch (error) {
            logger.error('Check wishlist error', error);
            res.status(500).json({ success: false, message: 'Failed to check wishlist' });
        }
    }
}
