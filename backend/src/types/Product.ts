// Product entity types

export interface Product {
    id: number;
    name: string;
    description?: string;
    price: number;
    category: string;
    stock_quantity: number;
    image_url?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateProductDTO {
    name: string;
    description?: string;
    price: number;
    category: string;
    stock_quantity?: number;
    image_url?: string;
}

export interface UpdateProductDTO {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    stock_quantity?: number;
    image_url?: string;
    is_active?: boolean;
}

export interface ProductFilters {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    isActive?: boolean;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'price' | 'created_at' | 'stock_quantity';
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedProducts {
    products: Product[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}