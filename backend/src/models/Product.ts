import { pool } from '../config/database';
import {
    Product,
    CreateProductDTO,
    UpdateProductDTO,
    ProductFilters,
    PaginationParams,
    PaginatedProducts,
} from '../types/Product';

export class ProductModel {
    /**
     * Create a new product
     */
    static async create(productData: CreateProductDTO): Promise<Product> {
        const { name, description, price, category, stock_quantity = 0, image_url } = productData;

        const query = `
            INSERT INTO products (name, description, price, category, stock_quantity, image_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(query, [
            name,
            description,
            price,
            category,
            stock_quantity,
            image_url,
        ]);

        return result.rows[0];
    }

    /**
     * Find product by ID
     */
    static async findById(id: number): Promise<Product | null> {
        const query = 'SELECT * FROM products WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }

    /**
     * Get all products with filters and pagination
     */
    static async findAll(
        filters: ProductFilters = {},
        pagination: PaginationParams = {}
    ): Promise<PaginatedProducts> {
        const {
            category,
            minPrice,
            maxPrice,
            search,
            isActive = true,
        } = filters;

        const {
            page = 1,
            limit = 10,
            sortBy = 'created_at',
            sortOrder = 'desc',
        } = pagination;

        // Build WHERE clause
        const conditions: string[] = [];
        const params: any[] = [];
        let paramCount = 1;

        if (isActive !== undefined) {
            conditions.push(`is_active = $${paramCount}`);
            params.push(isActive);
            paramCount++;
        }

        if (category) {
            conditions.push(`category = $${paramCount}`);
            params.push(category);
            paramCount++;
        }

        if (minPrice !== undefined) {
            conditions.push(`price >= $${paramCount}`);
            params.push(minPrice);
            paramCount++;
        }

        if (maxPrice !== undefined) {
            conditions.push(`price <= $${paramCount}`);
            params.push(maxPrice);
            paramCount++;
        }

        if (search) {
            conditions.push(`search_vector @@ plainto_tsquery('english', $${paramCount})`);
            params.push(search);
            paramCount++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count total
        const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Calculate pagination
        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        // Get products
        const query = `
            SELECT * FROM products
            ${whereClause}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        const result = await pool.query(query, [...params, limit, offset]);

        return {
            products: result.rows,
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
     * Update product
     */
    static async update(id: number, updates: UpdateProductDTO): Promise<Product | null> {
        const allowedFields = [
            'name',
            'description',
            'price',
            'category',
            'stock_quantity',
            'image_url',
            'is_active',
        ];
        const fields = Object.keys(updates).filter((key) => allowedFields.includes(key));

        if (fields.length === 0) {
            return this.findById(id);
        }

        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = fields.map((field) => updates[field as keyof UpdateProductDTO]);

        const query = `
            UPDATE products
            SET ${setClause}
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [id, ...values]);
        return result.rows[0] || null;
    }

    /**
     * Delete product (soft delete - set is_active to false)
     */
    static async softDelete(id: number): Promise<boolean> {
        const query = `
            UPDATE products
            SET is_active = FALSE
            WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rowCount !== null && result.rowCount > 0;
    }

    /**
     * Delete product (hard delete - permanently remove)
     */
    static async hardDelete(id: number): Promise<boolean> {
        const query = 'DELETE FROM products WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rowCount !== null && result.rowCount > 0;
    }

    /**
     * Get all unique categories
     */
    static async getCategories(): Promise<string[]> {
        const query = `
            SELECT DISTINCT category
            FROM products
            WHERE is_active = TRUE
            ORDER BY category
        `;
        const result = await pool.query(query);
        return result.rows.map((row) => row.category);
    }

    /**
     * Search products by name or description
     */
    static async search(searchTerm: string, limit: number = 10): Promise<Product[]> {
        const query = `
            SELECT *
            FROM products
            WHERE is_active = TRUE
                AND search_vector @@ plainto_tsquery('english', $1)
            ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
            LIMIT $2
        `;
        const result = await pool.query(query, [searchTerm, limit]);
        return result.rows;
    }

    /**
     * Update stock quantity
     */
    static async updateStock(id: number, quantity: number): Promise<Product | null> {
        const query = `
            UPDATE products
            SET stock_quantity = stock_quantity + $2
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [id, quantity]);
        return result.rows[0] || null;
    }

    /**
     * Check if product has sufficient stock
     */
    static async hasStock(id: number, requiredQuantity: number): Promise<boolean> {
        const query = 'SELECT stock_quantity FROM products WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (!result.rows[0]) return false;

        return result.rows[0].stock_quantity >= requiredQuantity;
    }
}