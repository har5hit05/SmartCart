import { ReviewModel, Review, ReviewStats } from '../models/Review';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';

export class ReviewService {
    static async createReview(userId: number, productId: number, rating: number, title?: string, comment?: string): Promise<Review> {
        const existing = await ReviewModel.getUserReview(userId, productId);
        if (existing) {
            throw new ConflictError('You have already reviewed this product');
        }
        return ReviewModel.create(userId, productId, rating, title, comment);
    }

    static async updateReview(reviewId: number, userId: number, data: { rating?: number; title?: string; comment?: string }): Promise<Review> {
        const review = await ReviewModel.update(reviewId, userId, data);
        if (!review) {
            throw new NotFoundError('Review not found or you are not the author');
        }
        return review;
    }

    static async deleteReview(reviewId: number, userId: number): Promise<void> {
        const deleted = await ReviewModel.delete(reviewId, userId);
        if (!deleted) {
            throw new NotFoundError('Review not found or you are not the author');
        }
    }

    static async getProductReviews(productId: number, page: number, limit: number, sortBy: string): Promise<{ reviews: Review[]; total: number }> {
        return ReviewModel.getByProduct(productId, page, limit, sortBy);
    }

    static async getReviewStats(productId: number): Promise<ReviewStats> {
        return ReviewModel.getStats(productId);
    }

    static async getUserReview(userId: number, productId: number): Promise<Review | null> {
        return ReviewModel.getUserReview(userId, productId);
    }

    static async markHelpful(reviewId: number): Promise<void> {
        await ReviewModel.markHelpful(reviewId);
    }
}
