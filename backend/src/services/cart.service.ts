import { CartModel } from '../models/Cart';
import { ProductModel } from '../models/Product';
import { AddToCartDTO, UpdateCartItemDTO, CartSummary } from '../types/Cart';
import { logger } from '../utils/logger';

export class CartService {
    /**
     * Add product to cart
     */
    static async addToCart(userId: number, data: AddToCartDTO): Promise<void> {
        const { product_id, quantity } = data;

        // Validate quantity
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
        }

        // Check if product exists and is active
        const product = await ProductModel.findById(product_id);
        if (!product) {
            throw new Error('Product not found');
        }

        if (!product.is_active) {
            throw new Error('Product is not available');
        }

        // Check stock availability
        const hasStock = await ProductModel.hasStock(product_id, quantity);
        if (!hasStock) {
            throw new Error(`Only ${product.stock_quantity} items available in stock`);
        }

        // Add to cart
        await CartModel.addItem(userId, data);

        logger.info(`Product ${product_id} added to cart for user ${userId}`);
    }

    /**
     * Get user's cart with items and summary
     */
    static async getCart(userId: number): Promise<CartSummary> {
        const items = await CartModel.getCartItems(userId);

        // Filter out inactive products
        const activeItems = items.filter((item) => item.product.is_active);

        // Calculate summary
        const subtotal = activeItems.reduce((sum, item) => sum + item.subtotal, 0);
        const tax = subtotal * 0.18; // 18% GST (example)
        const shippingFee = subtotal > 500 ? 0 : 50; // Free shipping above ₹500
        const total = subtotal + tax + shippingFee;

        return {
            items: activeItems,
            summary: {
                itemCount: activeItems.reduce((sum, item) => sum + item.quantity, 0),
                subtotal: Math.round(subtotal * 100) / 100,
                tax: Math.round(tax * 100) / 100,
                shippingFee,
                total: Math.round(total * 100) / 100,
            },
        };
    }

    /**
     * Update cart item quantity
     */
    static async updateCartItem(
        userId: number,
        productId: number,
        data: UpdateCartItemDTO
    ): Promise<void> {
        const { quantity } = data;

        // Validate quantity
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
        }

        // Check if item exists in cart
        const cartItem = await CartModel.getItem(userId, productId);
        if (!cartItem) {
            throw new Error('Item not found in cart');
        }

        // Check stock availability
        const hasStock = await ProductModel.hasStock(productId, quantity);
        if (!hasStock) {
            const product = await ProductModel.findById(productId);
            throw new Error(`Only ${product?.stock_quantity || 0} items available in stock`);
        }

        // Update quantity
        await CartModel.updateQuantity(userId, productId, quantity);

        logger.info(`Cart item ${productId} updated to quantity ${quantity} for user ${userId}`);
    }

    /**
     * Remove item from cart
     */
    static async removeFromCart(userId: number, productId: number): Promise<void> {
        const removed = await CartModel.removeItem(userId, productId);

        if (!removed) {
            throw new Error('Item not found in cart');
        }

        logger.info(`Product ${productId} removed from cart for user ${userId}`);
    }

    /**
     * Clear entire cart
     */
    static async clearCart(userId: number): Promise<void> {
        await CartModel.clearCart(userId);
        logger.info(`Cart cleared for user ${userId}`);
    }

    /**
     * Get cart item count
     */
    static async getCartCount(userId: number): Promise<number> {
        return await CartModel.getItemCount(userId);
    }
}