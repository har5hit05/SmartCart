/**
 * RecentlyViewed Component
 *
 * Displays the last viewed products in a horizontal scrollable row.
 * Shows relative timestamps ("2 hours ago", "Yesterday") under each card.
 */

import { Link } from 'react-router-dom';
import { Clock, ShoppingBag, X } from 'lucide-react';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import type { RecentlyViewedProduct } from '../hooks/useRecentlyViewed';

interface RecentlyViewedProps {
  /** Exclude a specific product ID (e.g., the product currently being viewed) */
  excludeId?: number;
  /** Maximum number of products to show (default: 10) */
  maxItems?: number;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return 'Yesterday';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function RecentlyViewed({ excludeId, maxItems = 10 }: RecentlyViewedProps) {
  const { getProducts, clearProducts } = useRecentlyViewed();

  const items = getProducts(excludeId).slice(0, maxItems);

  if (items.length === 0) return null;

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-gray-900">Recently Viewed</h2>
          <span className="text-sm text-gray-400 font-normal">({items.length})</span>
        </div>
        <button
          onClick={clearProducts}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          title="Clear recently viewed"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {items.map((product: RecentlyViewedProduct) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="group min-w-[180px] max-w-[180px] bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 shrink-0"
          >
            {/* Image */}
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <ShoppingBag className="h-8 w-8 text-indigo-300" />
              </div>
            )}

            {/* Info */}
            <div className="p-3">
              <p className="text-[11px] text-indigo-600 font-medium mb-0.5">{product.category}</p>
              <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                {product.name}
              </h4>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-sm font-bold text-gray-900">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formatTimeAgo(product.viewedAt)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
