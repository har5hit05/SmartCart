// Cart entity types

import { Product } from './Product';

export interface CartItem {
    id: number;
    user_id: number;
    product_id: number;
    quantity: number;
    created_at: Date;
    updated_at: Date;
}

export interface CartItemWithProduct extends CartItem {
    product: Product;
    subtotal: number;
}

export interface AddToCartDTO {
    product_id: number;
    quantity: number;
}

export interface UpdateCartItemDTO {
    quantity: number;
}

export interface CartSummary {
    items: CartItemWithProduct[];
    summary: {
        itemCount: number;
        subtotal: number;
        tax: number;
        shippingFee: number;
        total: number;
    };
}