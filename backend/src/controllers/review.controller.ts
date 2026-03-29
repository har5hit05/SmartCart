import { Request, Response } from 'express';
import { ReviewService } from '../services/review.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../utils/logger';

export class ReviewController {
    static async createReview(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const productId = parseInt(req.params.productId as string);
            const { rating, title, comment } = req.body;

            const review = await ReviewService.createReview(
                authReq.user!.id, productId, rating, title, comment
            );

            res.status(201).json({ success: true, data: review });
        } catch (error: any) {
            if (error.code === '23505') {
                res.status(409).json({ success: false, message: 'You have already reviewed this product' });
                return;
            }
            if (error.statusCode) {
                res.status(error.statusCode).json({ success: false, message: error.message });
                return;
            }
            logger.error('Create review error', error);
            res.status(500).json({ success: false, message: 'Failed to create review' });
        }
    }

    static async updateReview(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const reviewId = parseInt(req.params.reviewId as string);
            const { rating, title, comment } = req.body;

            const review = await ReviewService.updateReview(reviewId, authReq.user!.id, { rating, title, comment });
            res.status(200).json({ success: true, data: review });
        } catch (error: any) {
            if (error.statusCode) {
                res.status(error.statusCode).json({ success: false, message: error.message });
                return;
            }
            logger.error('Update review error', error);
            res.status(500).json({ success: false, message: 'Failed to update review' });
        }
    }

    static async deleteReview(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const reviewId = parseInt(req.params.reviewId as string);

            await ReviewService.deleteReview(reviewId, authReq.user!.id);
            res.status(200).json({ success: true, message: 'Review deleted' });
        } catch (error: any) {
            if (error.statusCode) {
                res.status(error.statusCode).json({ success: false, message: error.message });
                return;
            }
            logger.error('Delete review error', error);
            res.status(500).json({ success: false, message: 'Failed to delete review' });
        }
    }

    static async getProductReviews(req: Request, res: Response): Promise<void> {
        try {
            const productId = parseInt(req.params.productId as string);
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const sortBy = (req.query.sortBy as string) || 'newest';

            const result = await ReviewService.getProductReviews(productId, page, limit, sortBy);
            const stats = await ReviewService.getReviewStats(productId);

            res.status(200).json({
                success: true,
                data: { ...result, stats }
            });
        } catch (error) {
            logger.error('Get product reviews error', error);
            res.status(500).json({ success: false, message: 'Failed to get reviews' });
        }
    }

    static async getUserReview(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const productId = parseInt(req.params.productId as string);

            const review = await ReviewService.getUserReview(authReq.user!.id, productId);
            res.status(200).json({ success: true, data: review });
        } catch (error) {
            logger.error('Get user review error', error);
            res.status(500).json({ success: false, message: 'Failed to get review' });
        }
    }

    static async markHelpful(req: Request, res: Response): Promise<void> {
        try {
            const reviewId = parseInt(req.params.reviewId as string);
            await ReviewService.markHelpful(reviewId);
            res.status(200).json({ success: true, message: 'Marked as helpful' });
        } catch (error) {
            logger.error('Mark helpful error', error);
            res.status(500).json({ success: false, message: 'Failed to mark as helpful' });
        }
    }
}
