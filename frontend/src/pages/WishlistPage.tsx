import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { wishlistAPI } from '../api/client';
import { useCart } from '../contexts/CartContext';

interface WishlistItem {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  // Flat product fields from JOIN
  name: string;
  price: number;
  image_url?: string;
  category: string;
  stock_quantity: number;
  is_active: boolean;
  avg_rating?: number;
  review_count?: number;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function WishlistPage() {
  const { addToCart } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<number | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, []);

  async function fetchWishlist() {
    setLoading(true);
    try {
      const res = await wishlistAPI.getAll();
      const data = res.data.data;
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load wishlist');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(productId: number) {
    setRemovingId(productId);
    try {
      await wishlistAPI.remove(productId);
      setItems((prev) => prev.filter((item) => item.product_id !== productId));
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleAddToCart(item: WishlistItem) {
    setAddingToCartId(item.product_id);
    try {
      await addToCart(item.product_id, 1);
      toast.success(`${item.name} added to cart!`);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCartId(null);
    }
  }

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="rounded-full bg-pink-50 p-6 mb-6">
              <Heart className="h-16 w-16 text-pink-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-8 text-center max-w-md">
              Browse our products and add items you love to your wishlist. They'll be waiting for you here!
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-6 py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              Explore Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-7 w-7 fill-pink-500 text-pink-500" />
          <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
          {!loading && (
            <span className="rounded-full bg-pink-100 px-3 py-0.5 text-sm font-medium text-pink-700">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const inStock = item.stock_quantity > 0 && item.is_active;
              return (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Image */}
                  <Link to={`/products/${item.product_id}`} className="block relative">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <ShoppingCart className="h-12 w-12 text-white/60" />
                      </div>
                    )}
                    {/* Remove heart overlay */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(item.product_id);
                      }}
                      disabled={removingId === item.product_id}
                      className="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur-sm p-2 shadow-md hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Remove from wishlist"
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          removingId === item.product_id
                            ? 'text-gray-400'
                            : 'fill-red-500 text-red-500'
                        }`}
                      />
                    </button>
                  </Link>

                  {/* Content */}
                  <div className="p-4">
                    <Link to={`/products/${item.product_id}`}>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 hover:text-indigo-600 transition-colors">
                        {item.name}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      {item.avg_rating != null && Number(item.avg_rating) > 0 && (
                        <RatingStars rating={Number(item.avg_rating)} />
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-gray-900">
                        &#8377;{Number(item.price).toLocaleString('en-IN')}
                      </span>
                      <span className={`text-xs font-medium ${inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                        {inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={!inStock || addingToCartId === item.product_id}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {addingToCartId === item.product_id ? 'Adding...' : 'Add to Cart'}
                      </button>
                      <button
                        onClick={() => handleRemove(item.product_id)}
                        disabled={removingId === item.product_id}
                        className="flex items-center justify-center rounded-xl border border-gray-300 px-3 py-2.5 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-300 disabled:opacity-50 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
