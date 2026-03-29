import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../utils/logger';

export class AIController {
    /**
     * GET /api/ai/search?q=term
     * Semantic search using AI embeddings
     */
    static async semanticSearch(req: Request, res: Response): Promise<void> {
        try {
            const query = req.query.q as string;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

            const products = await AIService.semanticSearch(query, limit);

            res.status(200).json({
                success: true,
                data: products,
                meta: { searchType: 'semantic', query, count: products.length },
            });
        } catch (error) {
            logger.error('Semantic search error', error);
            res.status(500).json({
                success: false,
                message: 'Search failed',
            });
        }
    }

    /**
     * GET /api/ai/recommendations/:productId
     * Get AI product recommendations
     */
    static async getRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const productId = parseInt(req.params.productId as string);
            if (isNaN(productId)) {
                res.status(400).json({ success: false, message: 'Invalid product ID' });
                return;
            }

            const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
            const products = await AIService.getRecommendations(productId, limit);

            res.status(200).json({
                success: true,
                data: products,
            });
        } catch (error) {
            logger.error('Recommendations error', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get recommendations',
            });
        }
    }

    /**
     * POST /api/ai/cart-suggestions
     * Get smart cart suggestions
     */
    static async getCartSuggestions(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                res.status(401).json({ success: false, message: 'Authentication required' });
                return;
            }

            const { productIds } = req.body;
            if (!Array.isArray(productIds) || productIds.length === 0) {
                res.status(400).json({ success: false, message: 'Product IDs required' });
                return;
            }

            const suggestions = await AIService.getCartSuggestions(productIds);

            res.status(200).json({
                success: true,
                data: suggestions,
            });
        } catch (error) {
            logger.error('Cart suggestions error', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get suggestions',
            });
        }
    }

    /**
     * POST /api/ai/chat
     * AI Shopping Assistant
     */
    static async chat(req: Request, res: Response): Promise<void> {
        try {
            const { message, conversationHistory } = req.body;

            const result = await AIService.chat(message, conversationHistory);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            logger.error('AI chat error', error);
            res.status(500).json({
                success: false,
                message: 'Chat service unavailable',
            });
        }
    }

    /**
     * POST /api/ai/embeddings/generate (Admin)
     * Generate embeddings for all products
     */
    static async generateEmbeddings(req: Request, res: Response): Promise<void> {
        try {
            const result = await AIService.generateAllEmbeddings();

            res.status(200).json({
                success: true,
                message: 'Embedding generation complete',
                data: result,
            });
        } catch (error) {
            logger.error('Generate embeddings error', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate embeddings',
            });
        }
    }
}
