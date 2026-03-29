// Order entity types

export type OrderStatus =
    | 'PLACED'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'DISPATCHED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'REFUNDED';

export type PaymentMethod = 'COD' | 'RAZORPAY' | 'CARD' | 'UPI' | 'WALLET' | 'NETBANKING';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Order {
    id: number;
    user_id: number;
    status: OrderStatus;

    // Pricing
    subtotal: number;
    tax: number;
    shipping_fee: number;
    discount: number;
    total: number;

    // Shipping address
    shipping_address_line1: string;
    shipping_address_line2?: string;
    shipping_city: string;
    shipping_state: string;
    shipping_postal_code: string;
    shipping_country: string;
    shipping_phone: string;

    // Payment
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    payment_id?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    stripe_payment_intent_id?: string;
    payment_provider?: string;
    payment_method_detail?: string;
    refund_id?: string;

    // Tracking
    tracking_number?: string;
    courier_name?: string;
    estimated_delivery_date?: Date;

    // Notes
    customer_notes?: string;
    admin_notes?: string;

    // Timestamps
    created_at: Date;
    updated_at: Date;
    confirmed_at?: Date;
    dispatched_at?: Date;
    delivered_at?: Date;
    cancelled_at?: Date;
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;

    // Product snapshot
    product_name: string;
    product_description?: string;
    product_image_url?: string;

    // Pricing
    unit_price: number;
    quantity: number;
    subtotal: number;

    created_at: Date;
}

export interface OrderWithItems extends Order {
    items: OrderItem[];
}

export interface CreateOrderDTO {
    // Shipping address
    shipping_address_line1: string;
    shipping_address_line2?: string;
    shipping_city: string;
    shipping_state: string;
    shipping_postal_code: string;
    shipping_country?: string;
    shipping_phone: string;

    // Payment
    payment_method: PaymentMethod;

    // Notes
    customer_notes?: string;
}

export interface UpdateOrderStatusDTO {
    status: OrderStatus;
    notes?: string;
    tracking_number?: string;
    courier_name?: string;
    estimated_delivery_date?: string;
}

export interface OrderFilters {
    status?: OrderStatus;
    payment_status?: PaymentStatus;
    from_date?: string;
    to_date?: string;
}

export interface PaginatedOrders {
    orders: OrderWithItems[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface OrderStatusHistory {
    id: number;
    order_id: number;
    status: OrderStatus;
    notes?: string;
    changed_by?: number;
    created_at: Date;
}