import OpenAI from 'openai';
import { config } from '../config';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { Product } from '../types/Product';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
    if (!config.openai.apiKey || config.openai.apiKey === 'your-openai-api-key-here') {
        return null;
    }
    if (!openai) {
        openai = new OpenAI({ apiKey: config.openai.apiKey });
    }
    return openai;
}

export class AIService {
    /**
     * Generate embedding for a text string
     */
    static async generateEmbedding(text: string): Promise<number[] | null> {
        const client = getOpenAI();
        if (!client) return null;

        try {
            const response = await client.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
            });
            return response.data[0].embedding;
        } catch (error) {
            logger.error('Failed to generate embedding', error);
            return null;
        }
    }

    /**
     * Generate and store embedding for a product
     */
    static async generateProductEmbedding(productId: number): Promise<void> {
        const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
        const product = productResult.rows[0];
        if (!product) return;

        const text = `${product.name}. ${product.description || ''}. Category: ${product.category}`;
        const embedding = await this.generateEmbedding(text);

        if (embedding) {
            await pool.query(
                'UPDATE products SET embedding = $1 WHERE id = $2',
                [`[${embedding.join(',')}]`, productId]
            );
            logger.info(`Embedding generated for product ${productId}`);
        }
    }

    /**
     * Generate embeddings for all products that don't have one
     */
    static async generateAllEmbeddings(): Promise<{ processed: number; failed: number }> {
        const result = await pool.query(
            'SELECT id FROM products WHERE embedding IS NULL AND is_active = TRUE'
        );

        let processed = 0;
        let failed = 0;

        for (const row of result.rows) {
            try {
                await this.generateProductEmbedding(row.id);
                processed++;
                // Rate limit: wait 200ms between requests
                await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
                failed++;
                logger.error(`Failed to generate embedding for product ${row.id}`, error);
            }
        }

        return { processed, failed };
    }

    /**
     * Semantic search using vector similarity
     */
    static async semanticSearch(query: string, limit: number = 10): Promise<Product[]> {
        const client = getOpenAI();

        // Fallback to full-text search if OpenAI is not configured
        if (!client) {
            return this.fallbackSearch(query, limit);
        }

        try {
            const embedding = await this.generateEmbedding(query);
            if (!embedding) {
                return this.fallbackSearch(query, limit);
            }

            const result = await pool.query(
                `SELECT id, name, description, price, category, stock_quantity, image_url, is_active,
                        1 - (embedding <=> $1::vector) AS similarity
                 FROM products
                 WHERE is_active = TRUE AND embedding IS NOT NULL
                 ORDER BY embedding <=> $1::vector
                 LIMIT $2`,
                [`[${embedding.join(',')}]`, limit]
            );

            if (result.rows.length === 0) {
                return this.fallbackSearch(query, limit);
            }

            return result.rows;
        } catch (error) {
            logger.error('Semantic search failed, falling back to text search', error);
            return this.fallbackSearch(query, limit);
        }
    }

    /**
     * Fallback to PostgreSQL full-text search
     */
    private static async fallbackSearch(query: string, limit: number): Promise<Product[]> {
        const result = await pool.query(
            `SELECT *, ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
             FROM products
             WHERE is_active = TRUE
               AND (search_vector @@ plainto_tsquery('english', $1)
                    OR name ILIKE '%' || $1 || '%'
                    OR description ILIKE '%' || $1 || '%')
             ORDER BY rank DESC
             LIMIT $2`,
            [query, limit]
        );
        return result.rows;
    }

    /**
     * Get AI-powered product recommendations
     */
    static async getRecommendations(productId: number, limit: number = 5): Promise<Product[]> {
        try {
            // Try vector-based recommendations first
            const result = await pool.query(
                `SELECT p.*, 1 - (p.embedding <=> target.embedding) AS similarity
                 FROM products p, products target
                 WHERE target.id = $1
                   AND p.id != $1
                   AND p.is_active = TRUE
                   AND p.embedding IS NOT NULL
                   AND target.embedding IS NOT NULL
                 ORDER BY p.embedding <=> target.embedding
                 LIMIT $2`,
                [productId, limit]
            );

            if (result.rows.length > 0) {
                return result.rows;
            }
        } catch (error) {
            logger.debug('Vector recommendations failed, using category fallback');
        }

        // Fallback: same category products
        const fallback = await pool.query(
            `SELECT * FROM products
             WHERE category = (SELECT category FROM products WHERE id = $1)
               AND id != $1
               AND is_active = TRUE
             ORDER BY RANDOM()
             LIMIT $2`,
            [productId, limit]
        );
        return fallback.rows;
    }

    /**
     * Get smart cart suggestions based on cart items
     */
    static async getCartSuggestions(productIds: number[], limit: number = 4): Promise<Product[]> {
        if (productIds.length === 0) return [];

        try {
            // Get average embedding of cart items
            const result = await pool.query(
                `SELECT AVG(embedding) AS avg_embedding
                 FROM products
                 WHERE id = ANY($1) AND embedding IS NOT NULL`,
                [productIds]
            );

            const avgEmbedding = result.rows[0]?.avg_embedding;
            if (avgEmbedding) {
                const suggestions = await pool.query(
                    `SELECT *, 1 - (embedding <=> $1::vector) AS similarity
                     FROM products
                     WHERE id != ALL($2)
                       AND is_active = TRUE
                       AND embedding IS NOT NULL
                     ORDER BY embedding <=> $1::vector
                     LIMIT $3`,
                    [avgEmbedding, productIds, limit]
                );

                if (suggestions.rows.length > 0) {
                    return suggestions.rows;
                }
            }
        } catch (error) {
            logger.debug('AI cart suggestions failed, using category fallback');
        }

        // Fallback: products from categories of cart items
        const fallback = await pool.query(
            `SELECT DISTINCT ON (p.id) p.*
             FROM products p
             WHERE p.category IN (SELECT category FROM products WHERE id = ANY($1))
               AND p.id != ALL($1)
               AND p.is_active = TRUE
             ORDER BY p.id, RANDOM()
             LIMIT $2`,
            [productIds, limit]
        );
        return fallback.rows;
    }

    /**
     * AI Shopping Assistant (RAG-based chatbot)
     */
    static async chat(
        message: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    ): Promise<{ reply: string; products?: Product[] }> {
        const client = getOpenAI();

        if (!client) {
            return this.fallbackChat(message);
        }

        try {
            // Search for relevant products based on user message
            const relevantProducts = await this.semanticSearch(message, 5);

            const productContext = relevantProducts.length > 0
                ? `\nRelevant products in our store:\n${relevantProducts.map((p) =>
                    `- ${p.name} (₹${p.price}) - ${p.description || p.category}. Stock: ${p.stock_quantity}`
                ).join('\n')}`
                : '\nNo specific products found matching the query.';

            const systemPrompt = `You are SmartCart AI, a helpful shopping assistant for an e-commerce store.
You help customers find products, compare options, and make purchase decisions.
Be concise, friendly, and helpful. If asked about products, reference the ones available in the store.
Always mention prices in ₹ (Indian Rupees).
If a customer asks about something not in the product catalog, politely say so and suggest alternatives.
${productContext}`;

            const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.slice(-6).map((m) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                })),
                { role: 'user', content: message },
            ];

            const response = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 500,
                temperature: 0.7,
            });

            const reply = response.choices[0]?.message?.content || 'I apologize, I could not process your request.';

            return {
                reply,
                products: relevantProducts.length > 0 ? relevantProducts : undefined,
            };
        } catch (error) {
            logger.error('AI chat failed', error);
            return this.fallbackChat(message);
        }
    }

    /**
     * Fallback chat when OpenAI is not available
     */
    private static async fallbackChat(message: string): Promise<{ reply: string; products?: Product[] }> {
        const msg = message.toLowerCase().trim();

        // Handle greetings
        if (/^(hi|hello|hey|hii+|howdy|sup|yo|good\s*(morning|afternoon|evening))[\s!?.]*$/i.test(msg)) {
            return {
                reply: 'Hello! 👋 Welcome to SmartCart! I can help you find products, compare options, or answer questions about our store. What are you looking for today?',
            };
        }

        // Handle thanks
        if (/^(thanks|thank\s*you|thx|ty|appreciate)[\s!?.]*$/i.test(msg)) {
            return {
                reply: 'You\'re welcome! 😊 Let me know if you need help finding anything else.',
            };
        }

        // Handle help / what can you do
        if (/\b(help|what can you do|what do you do|how.*work|assist)\b/i.test(msg)) {
            return {
                reply: 'I can help you with:\n• **Finding products** — try "show me electronics" or "I need a mouse"\n• **Comparing prices** — ask "what\'s the cheapest laptop?"\n• **Category browsing** — try "what categories do you have?"\n• **Product details** — ask about any specific product\n\nJust type what you\'re looking for!',
            };
        }

        // Handle category queries
        if (/\b(categories|category|what.*sell|what.*have|what.*offer|browse)\b/i.test(msg)) {
            const catResult = await pool.query(
                'SELECT DISTINCT category, COUNT(*) as count FROM products WHERE is_active = TRUE GROUP BY category ORDER BY category'
            );
            if (catResult.rows.length > 0) {
                const catList = catResult.rows.map((r: any) => `• **${r.category}** (${r.count} products)`).join('\n');
                return {
                    reply: `We have products in these categories:\n${catList}\n\nAsk me about any category to see the products!`,
                };
            }
        }

        // Handle price-related queries
        if (/\b(cheap|cheapest|affordable|budget|expensive|price|cost|under\s*\d+|below\s*\d+)\b/i.test(msg)) {
            const priceMatch = msg.match(/(?:under|below|less than|within)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
            let products: Product[];
            if (priceMatch) {
                const maxPrice = parseInt(priceMatch[1]);
                const result = await pool.query(
                    `SELECT * FROM products WHERE is_active = TRUE AND price <= $1 ORDER BY price ASC LIMIT 5`,
                    [maxPrice]
                );
                products = result.rows;
                if (products.length > 0) {
                    return {
                        reply: `Here are products under ₹${maxPrice}:`,
                        products,
                    };
                }
                return { reply: `Sorry, I couldn't find any products under ₹${maxPrice}. Try a higher budget?` };
            }
            if (/cheap|affordable|budget/i.test(msg)) {
                const result = await pool.query(
                    'SELECT * FROM products WHERE is_active = TRUE ORDER BY price ASC LIMIT 5'
                );
                products = result.rows;
                if (products.length > 0) {
                    return {
                        reply: 'Here are our most affordable products:',
                        products,
                    };
                }
            }
        }

        // Extract keywords by removing common stop words and search intent phrases
        const stopWords = new Set([
            'i', 'me', 'my', 'want', 'need', 'looking', 'for', 'find', 'search',
            'show', 'get', 'buy', 'can', 'you', 'please', 'the', 'a', 'an', 'some',
            'any', 'do', 'have', 'is', 'are', 'it', 'in', 'of', 'to', 'with',
            'about', 'tell', 'give', 'suggest', 'recommend', 'what', 'which', 'best',
        ]);

        const keywords = msg
            .replace(/[?!.,;:'"]/g, '')
            .split(/\s+/)
            .filter((w) => w.length > 1 && !stopWords.has(w));

        // Search with individual keywords for better matching
        let allProducts: Product[] = [];
        if (keywords.length > 0) {
            // Try the full keyword string first
            allProducts = await this.fallbackSearch(keywords.join(' '), 5);

            // If no results, try individual keywords
            if (allProducts.length === 0) {
                for (const keyword of keywords) {
                    const results = await this.fallbackSearch(keyword, 3);
                    allProducts.push(...results);
                }
                // Deduplicate
                const seen = new Set<number>();
                allProducts = allProducts.filter((p) => {
                    if (seen.has(p.id)) return false;
                    seen.add(p.id);
                    return true;
                }).slice(0, 5);
            }
        }

        if (allProducts.length > 0) {
            return {
                reply: `I found ${allProducts.length} product${allProducts.length > 1 ? 's' : ''} that might interest you:`,
                products: allProducts,
            };
        }

        // Suggest popular products when nothing matches
        const popular = await pool.query(
            'SELECT * FROM products WHERE is_active = TRUE ORDER BY stock_quantity DESC LIMIT 4'
        );

        if (popular.rows.length > 0) {
            return {
                reply: `I couldn't find an exact match for "${keywords.join(' ') || message}", but here are some popular products you might like:`,
                products: popular.rows,
            };
        }

        return {
            reply: 'I couldn\'t find specific products matching your query. Try browsing our categories or searching with different keywords!',
        };
    }
}
