import { z } from 'zod';

// Auth validations
export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    full_name: z.string().min(2, 'Full name must be at least 2 characters').max(255),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Product validations
export const createProductSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be non-negative'),
    category: z.string().min(1, 'Category is required').max(100),
    stock_quantity: z.number().int().min(0).optional().default(0),
    image_url: z.string().url().optional(),
});

export const updateProductSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    price: z.number().min(0).optional(),
    category: z.string().min(1).max(100).optional(),
    stock_quantity: z.number().int().min(0).optional(),
    image_url: z.string().url().optional(),
    is_active: z.boolean().optional(),
});

// Cart validations
export const addToCartSchema = z.object({
    product_id: z.number().int().positive('Invalid product ID'),
    quantity: z.number().int().positive('Quantity must be greater than 0'),
});

export const updateCartSchema = z.object({
    quantity: z.number().int().positive('Quantity must be greater than 0'),
});

// Order validations
export const createOrderSchema = z.object({
    shipping_address_line1: z.string().min(1, 'Address is required').max(255),
    shipping_address_line2: z.string().max(255).optional(),
    shipping_city: z.string().min(1, 'City is required').max(100),
    shipping_state: z.string().min(1, 'State is required').max(100),
    shipping_postal_code: z.string().min(1, 'Postal code is required').max(20),
    shipping_country: z.string().max(100).optional().default('India'),
    shipping_phone: z.string().min(10, 'Valid phone number required').max(20),
    payment_method: z.enum(['COD', 'RAZORPAY', 'CARD', 'UPI', 'WALLET']),
    customer_notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
    status: z.enum(['PLACED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
    notes: z.string().max(500).optional(),
    tracking_number: z.string().max(100).optional(),
    courier_name: z.string().max(100).optional(),
    estimated_delivery_date: z.string().optional(),
});

// AI validations
export const chatMessageSchema = z.object({
    message: z.string().min(1, 'Message is required').max(1000),
    conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
    })).optional().default([]),
});

export const semanticSearchSchema = z.object({
    q: z.string().min(1, 'Search query is required').max(500),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});
