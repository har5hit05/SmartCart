import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Public: Get reviews for a product
router.get('/products/:productId/reviews', ReviewController.getProductReviews);

// Authenticated: Get user's own review for a product
router.get('/products/:productId/reviews/mine', authMiddleware, ReviewController.getUserReview);

// Authenticated: Create a review
router.post('/products/:productId/reviews', authMiddleware, ReviewController.createReview);

// Authenticated: Update own review
router.put('/reviews/:reviewId', authMiddleware, ReviewController.updateReview);

// Authenticated: Delete own review
router.delete('/reviews/:reviewId', authMiddleware, ReviewController.deleteReview);

// Authenticated: Mark review as helpful
router.post('/reviews/:reviewId/helpful', authMiddleware, ReviewController.markHelpful);

export default router;
