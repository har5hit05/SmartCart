import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { chatMessageSchema, semanticSearchSchema } from '../validations';
import { aiLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @route   GET /api/ai/search?q=term
 * @desc    Semantic search using AI embeddings
 * @access  Public
 */
router.get('/search', validate(semanticSearchSchema, 'query'), AIController.semanticSearch);

/**
 * @route   GET /api/ai/recommendations/:productId
 * @desc    Get AI-powered product recommendations
 * @access  Public
 */
router.get('/recommendations/:productId', AIController.getRecommendations);

/**
 * @route   POST /api/ai/cart-suggestions
 * @desc    Get smart cart suggestions based on cart items
 * @access  Private
 */
router.post('/cart-suggestions', authMiddleware, AIController.getCartSuggestions);

/**
 * @route   POST /api/ai/chat
 * @desc    AI Shopping Assistant chatbot
 * @access  Public (rate limited)
 */
router.post('/chat', aiLimiter, validate(chatMessageSchema), AIController.chat);

/**
 * @route   POST /api/ai/embeddings/generate
 * @desc    Generate embeddings for all products (Admin)
 * @access  Private (Admin)
 */
router.post('/embeddings/generate', authMiddleware, adminMiddleware, AIController.generateEmbeddings);

export default router;
