import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SmartCart API',
            version: '1.0.0',
            description: 'AI-powered e-commerce platform with semantic search, product recommendations, and intelligent shopping assistant',
            contact: { name: 'SmartCart Team' },
        },
        servers: [
            { url: 'http://localhost:3000', description: 'Development server' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        code: { type: 'string' },
                    },
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        category: { type: 'string' },
                        stock_quantity: { type: 'integer' },
                        image_url: { type: 'string' },
                        is_active: { type: 'boolean' },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        email: { type: 'string' },
                        full_name: { type: 'string' },
                        role: { type: 'string', enum: ['customer', 'admin'] },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Products', description: 'Product management' },
            { name: 'Cart', description: 'Shopping cart operations' },
            { name: 'Orders', description: 'Order management' },
            { name: 'AI', description: 'AI-powered features' },
            { name: 'Admin', description: 'Admin analytics' },
        ],
        paths: {
            '/api/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'Register a new user',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password', 'full_name'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                        password: { type: 'string', minLength: 6 },
                                        full_name: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: { '201': { description: 'User registered successfully' } },
                },
            },
            '/api/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Login user',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string' },
                                        password: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: { '200': { description: 'Login successful' } },
                },
            },
            '/api/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get current user',
                    security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Current user info' } },
                },
            },
            '/api/products': {
                get: {
                    tags: ['Products'],
                    summary: 'Get all products',
                    parameters: [
                        { name: 'category', in: 'query', schema: { type: 'string' } },
                        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
                        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['name', 'price', 'created_at'] } },
                    ],
                    responses: { '200': { description: 'Product list with pagination' } },
                },
                post: {
                    tags: ['Products'],
                    summary: 'Create product (Admin)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Product' },
                            },
                        },
                    },
                    responses: { '201': { description: 'Product created' } },
                },
            },
            '/api/products/{id}': {
                get: {
                    tags: ['Products'],
                    summary: 'Get product by ID',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { '200': { description: 'Product details' } },
                },
            },
            '/api/cart': {
                get: {
                    tags: ['Cart'],
                    summary: 'Get cart',
                    security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Cart with items and summary' } },
                },
                post: {
                    tags: ['Cart'],
                    summary: 'Add to cart',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        product_id: { type: 'integer' },
                                        quantity: { type: 'integer' },
                                    },
                                },
                            },
                        },
                    },
                    responses: { '201': { description: 'Added to cart' } },
                },
            },
            '/api/orders': {
                get: {
                    tags: ['Orders'],
                    summary: 'Get user orders',
                    security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Order list' } },
                },
                post: {
                    tags: ['Orders'],
                    summary: 'Create order from cart',
                    security: [{ bearerAuth: [] }],
                    responses: { '201': { description: 'Order created' } },
                },
            },
            '/api/ai/search': {
                get: {
                    tags: ['AI'],
                    summary: 'Semantic search',
                    parameters: [
                        { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: { '200': { description: 'Search results with AI similarity ranking' } },
                },
            },
            '/api/ai/recommendations/{productId}': {
                get: {
                    tags: ['AI'],
                    summary: 'Get product recommendations',
                    parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: { '200': { description: 'Recommended products' } },
                },
            },
            '/api/ai/chat': {
                post: {
                    tags: ['AI'],
                    summary: 'AI Shopping Assistant',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['message'],
                                    properties: {
                                        message: { type: 'string' },
                                        conversationHistory: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    role: { type: 'string', enum: ['user', 'assistant'] },
                                                    content: { type: 'string' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: { '200': { description: 'AI response with optional product suggestions' } },
                },
            },
            '/api/admin/analytics/dashboard': {
                get: {
                    tags: ['Admin'],
                    summary: 'Dashboard analytics',
                    security: [{ bearerAuth: [] }],
                    responses: { '200': { description: 'Dashboard data' } },
                },
            },
        },
    },
    apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
