import { pool } from '../config/database';
import {
    Order,
    OrderItem,
    OrderWithItems,
    CreateOrderDTO,
    UpdateOrderStatusDTO,
    OrderFilters,
    PaginatedOrders,
    OrderStatusHistory,
} from '../types/Order';

export class OrderModel {
    /**
     * Create a new order
     */
    static async create(userId: number, orderData: CreateOrderDTO, pricing: {
        subtotal: number;
        tax: number;
        shipping_fee: number;
        discount: number;
        total: number;
    }): Promise<Order> {
        const {
            shipping_address_line1,
            shipping_address_line2,
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country = 'India',
            shipping_phone,
            payment_method,
            customer_notes,
        } = orderData;

        const query = `
            INSERT INTO orders (
                user_id, status, 
                subtotal, tax, shipping_fee, discount, total,
                shipping_address_line1, shipping_address_line2, 
                shipping_city, shipping_state, shipping_postal_code, shipping_country,
                shipping_phone,
                payment_method, payment_status,
                customer_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `;

        const result = await pool.query(query, [
            userId,
            'PLACED',
            pricing.subtotal,
            pricing.tax,
            pricing.shipping_fee,
            pricing.discount,
            pricing.total,
            shipping_address_line1,
            shipping_address_line2,
            shipping_city,
            shipping_state,
            shipping_postal_code,
            shipping_country,
            shipping_phone,
            payment_method,
            'PENDING',
            customer_notes,
        ]);

        return result.rows[0];
    }

    /**
     * Create order items
     */
    static async createOrderItems(orderId: number, items: Array<{
        product_id: number;
        product_name: string;
        product_description?: string;
        product_image_url?: string;
        unit_price: number;
        quantity: number;
        subtotal: number;
    }>): Promise<OrderItem[]> {
        const values: any[] = [];
        const valuePlaceholders: string[] = [];

        items.forEach((item, index) => {
            const offset = index * 8; // Changed from 7 to 8
            valuePlaceholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
            );
            values.push(
                orderId,
                item.product_id,
                item.product_name,
                item.product_description,
                item.product_image_url,
                item.unit_price,
                item.quantity,
                item.subtotal // Added subtotal
            );
        });

        const query = `
            INSERT INTO order_items (
                order_id, product_id, product_name, product_description, 
                product_image_url, unit_price, quantity, subtotal
            ) VALUES ${valuePlaceholders.join(', ')}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows;
    }

    /**
     * Find order by ID
     */
    static async findById(orderId: number): Promise<Order | null> {
        const query = 'SELECT * FROM orders WHERE id = $1';
        const result = await pool.query(query, [orderId]);
        return result.rows[0] || null;
    }

    /**
     * Find order with items by ID
     */
    static async findByIdWithItems(orderId: number): Promise<OrderWithItems | null> {
        const orderQuery = 'SELECT * FROM orders WHERE id = $1';
        const orderResult = await pool.query(orderQuery, [orderId]);

        if (orderResult.rows.length === 0) {
            return null;
        }

        const order = orderResult.rows[0];

        const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';
        const itemsResult = await pool.query(itemsQuery, [orderId]);

        return {
            ...order,
            items: itemsResult.rows,
        };
    }

    /**
     * Get all orders for a user with pagination and filters
     */
    static async findByUserId(
        userId: number,
        filters: OrderFilters = {},
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedOrders> {
        const { status, payment_status, from_date, to_date } = filters;

        // Build WHERE clause
        const conditions: string[] = ['user_id = $1'];
        const params: any[] = [userId];
        let paramCount = 2;

        if (status) {
            conditions.push(`status = $${paramCount}`);
            params.push(status);
            paramCount++;
        }

        if (payment_status) {
            conditions.push(`payment_status = $${paramCount}`);
            params.push(payment_status);
            paramCount++;
        }

        if (from_date) {
            conditions.push(`created_at >= $${paramCount}`);
            params.push(from_date);
            paramCount++;
        }

        if (to_date) {
            conditions.push(`created_at <= $${paramCount}`);
            params.push(to_date);
            paramCount++;
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        // Count total
        const countQuery = `SELECT COUNT(*) FROM orders ${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Calculate pagination
        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        // Get orders
        const ordersQuery = `
            SELECT * FROM orders
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        const ordersResult = await pool.query(ordersQuery, [...params, limit, offset]);

        // Get items for each order
        const ordersWithItems: OrderWithItems[] = await Promise.all(
            ordersResult.rows.map(async (order) => {
                const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';
                const itemsResult = await pool.query(itemsQuery, [order.id]);
                return {
                    ...order,
                    items: itemsResult.rows,
                };
            })
        );

        return {
            orders: ordersWithItems,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }

    /**
     * Get all orders (Admin) with pagination and filters
     */
    static async findAll(
        filters: OrderFilters = {},
        page: number = 1,
        limit: number = 10
    ): Promise<PaginatedOrders> {
        const { status, payment_status, from_date, to_date } = filters;

        // Build WHERE clause
        const conditions: string[] = [];
        const params: any[] = [];
        let paramCount = 1;

        if (status) {
            conditions.push(`status = $${paramCount}`);
            params.push(status);
            paramCount++;
        }

        if (payment_status) {
            conditions.push(`payment_status = $${paramCount}`);
            params.push(payment_status);
            paramCount++;
        }

        if (from_date) {
            conditions.push(`created_at >= $${paramCount}`);
            params.push(from_date);
            paramCount++;
        }

        if (to_date) {
            conditions.push(`created_at <= $${paramCount}`);
            params.push(to_date);
            paramCount++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count total
        const countQuery = `SELECT COUNT(*) FROM orders ${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Calculate pagination
        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        // Get orders
        const ordersQuery = `
            SELECT * FROM orders
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        const ordersResult = await pool.query(ordersQuery, [...params, limit, offset]);

        // Get items for each order
        const ordersWithItems: OrderWithItems[] = await Promise.all(
            ordersResult.rows.map(async (order) => {
                const itemsQuery = 'SELECT * FROM order_items WHERE order_id = $1';
                const itemsResult = await pool.query(itemsQuery, [order.id]);
                return {
                    ...order,
                    items: itemsResult.rows,
                };
            })
        );

        return {
            orders: ordersWithItems,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }

    /**
     * Update order status using database function
     */
    static async updateStatus(
        orderId: number,
        newStatus: string,
        notes?: string,
        changedBy?: number
    ): Promise<void> {
        const query = 'SELECT update_order_status($1, $2, $3, $4)';
        await pool.query(query, [orderId, newStatus, notes, changedBy]);
    }

    /**
     * Update order details
     */
    static async update(orderId: number, updates: Partial<Order>): Promise<Order | null> {
        const allowedFields = [
            'tracking_number',
            'courier_name',
            'estimated_delivery_date',
            'admin_notes',
            'payment_status',
            'payment_id',
            'razorpay_order_id',
            'razorpay_payment_id',
            'razorpay_signature',
            'stripe_payment_intent_id',
            'payment_provider',
            'payment_method_detail',
            'refund_id',
        ];

        const fields = Object.keys(updates).filter((key) => allowedFields.includes(key));

        if (fields.length === 0) {
            return this.findById(orderId);
        }

        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = fields.map((field) => updates[field as keyof Order]);

        const query = `
            UPDATE orders
            SET ${setClause}
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [orderId, ...values]);
        return result.rows[0] || null;
    }

    /**
     * Get order status history
     */
    static async getStatusHistory(orderId: number): Promise<OrderStatusHistory[]> {
        const query = `
            SELECT * FROM order_status_history
            WHERE order_id = $1
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query, [orderId]);
        return result.rows;
    }

    /**
     * Cancel order
     */
    static async cancel(orderId: number, userId: number): Promise<void> {
        await this.updateStatus(orderId, 'CANCELLED', 'Cancelled by customer', userId);
    }
}