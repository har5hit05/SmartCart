/**
 * useRecentlyViewed Hook
 *
 * Tracks the last 10 products a user has viewed using localStorage.
 * - addProduct(): saves a product to the "recently viewed" list
 * - getProducts(): returns the list (newest first)
 * - clearProducts(): empties the list
 *
 * Deduplicates entries — if a product is viewed again, it moves to the front.
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'smartcart_recently_viewed';
const MAX_ITEMS = 10;

export interface RecentlyViewedProduct {
  id: number;
  name: string;
  price: number;
  category: string;
  image_url?: string;
  viewedAt: number; // timestamp
}

function loadFromStorage(): RecentlyViewedProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: RecentlyViewedProduct[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage might be full or unavailable — fail silently
  }
}

export function useRecentlyViewed() {
  const [products, setProducts] = useState<RecentlyViewedProduct[]>(loadFromStorage);

  /**
   * Add a product to the recently viewed list.
   * If the product already exists, it gets moved to the front with an updated timestamp.
   */
  const addProduct = useCallback((product: {
    id: number;
    name: string;
    price: number;
    category: string;
    image_url?: string;
  }) => {
    setProducts((prev) => {
      // Remove existing entry for this product (dedup)
      const filtered = prev.filter((p) => p.id !== product.id);

      // Add to front with current timestamp
      const updated: RecentlyViewedProduct[] = [
        {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          image_url: product.image_url,
          viewedAt: Date.now(),
        },
        ...filtered,
      ].slice(0, MAX_ITEMS); // Keep only last 10

      saveToStorage(updated);
      return updated;
    });
  }, []);

  /**
   * Get all recently viewed products (newest first).
   * Optionally exclude a specific product ID (e.g., the currently viewed one).
   */
  const getProducts = useCallback((excludeId?: number): RecentlyViewedProduct[] => {
    const items = loadFromStorage();
    return excludeId ? items.filter((p) => p.id !== excludeId) : items;
  }, []);

  /**
   * Clear the entire recently viewed list.
   */
  const clearProducts = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProducts([]);
  }, []);

  return {
    products,
    addProduct,
    getProducts,
    clearProducts,
  };
}
