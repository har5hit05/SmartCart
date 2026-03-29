import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, ChevronLeft, Plus, Minus, Sparkles, Star, Heart } from 'lucide-react';
import ReviewSection from '../components/ReviewSection';
import RecentlyViewed from '../components/RecentlyViewed';
import StockAlertButton from '../components/StockAlertButton';
import toast from 'react-hot-toast';
import { productAPI, aiAPI, wishlistAPI } from '../api/client';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  stock_quantity: number;
  is_active: boolean;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { addProduct: addToRecentlyViewed } = useRecentlyViewed();

  const [product, setProduct] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const productId = Number(id);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setQuantity(1);

    productAPI.getById(productId)
      .then((res) => {
        const p = res.data.data;
        setProduct(p);
        // Track this product as recently viewed
        addToRecentlyViewed({
          id: p.id,
          name: p.name,
          price: p.price,
          category: p.category,
          image_url: p.image_url,
        });
      })
      .catch(() => {
        toast.error('Product not found');
        navigate('/products');
      })
      .finally(() => setLoading(false));

    // Check wishlist status
    if (user) {
      wishlistAPI.check(productId)
        .then((res) => setInWishlist(res.data.data?.inWishlist || false))
        .catch(() => setInWishlist(false));
    }

    // Fetch AI recommendations
    setRecsLoading(true);
    aiAPI.recommendations(productId)
      .then((res) => {
        const data = res.data.data;
        setRecommendations(Array.isArray(data) ? data : data.products || []);
      })
      .catch(() => setRecommendations([]))
      .finally(() => setRecsLoading(false));
  }, [id, productId, navigate]);

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }
    if (!product) return;
    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity);
      toast.success(`Added ${quantity} item${quantity > 1 ? 's' : ''} to cart!`);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleRecommendationAddToCart = async (recProductId: number) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }
    try {
      await addToCart(recProductId, 1);
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error('Please login to use wishlist');
      return;
    }
    if (!product) return;
    setWishlistLoading(true);
    try {
      if (inWishlist) {
        await wishlistAPI.remove(product.id);
        setInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await wishlistAPI.add(product.id);
        setInWishlist(true);
        toast.success('Added to wishlist!');
      }
    } catch {
      toast.error('Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-gray-200 rounded mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="h-96 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-6 bg-gray-200 rounded w-1/4" />
                <div className="h-20 bg-gray-200 rounded" />
                <div className="h-12 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const inStock = product.stock_quantity > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-gray-600 hover:text-indigo-600 mb-8 text-sm font-medium transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {/* Product Detail */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white rounded-2xl shadow-md p-6 md:p-8">
          {/* Image */}
          <div className="rounded-xl overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-80 md:h-96 object-cover"
              />
            ) : (
              <div className="w-full h-80 md:h-96 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center rounded-xl">
                <ShoppingCart className="h-20 w-20 text-white/50" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {product.name}
              </h1>
              <button
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                className="shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Heart
                  className={`h-6 w-6 transition-colors ${
                    inWishlist
                      ? 'fill-red-500 text-red-500'
                      : 'text-gray-400 hover:text-red-400'
                  }`}
                />
              </button>
            </div>

            <span className="inline-block self-start bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full mb-4">
              {product.category}
            </span>

            <p className="text-3xl font-bold text-gray-900 mb-4">
              &#8377;{product.price.toLocaleString('en-IN')}
            </p>

            {/* Stock Indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`h-2.5 w-2.5 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                {inStock ? `In Stock (${product.stock_quantity} available)` : 'Out of Stock'}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                {product.description}
              </p>
            )}

            {/* Quantity Selector + Add to Cart */}
            <div className="mt-auto space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 text-sm font-semibold text-gray-900 min-w-[3rem] text-center border-x border-gray-300">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                    disabled={quantity >= product.stock_quantity}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!inStock || addingToCart}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 text-base font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ShoppingCart className="h-5 w-5" />
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>

              {/* Back-in-Stock Alert */}
              <StockAlertButton productId={product.id} stockQuantity={product.stock_quantity} />
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-bold text-gray-900">You might also like</h2>
          </div>

          {recsLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[220px] bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
                  <div className="h-36 bg-gradient-to-br from-gray-200 to-gray-300" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <p className="text-gray-400 text-sm">No recommendations available.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="group min-w-[220px] max-w-[220px] bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shrink-0"
                >
                  <Link to={`/products/${rec.id}`}>
                    {rec.image_url ? (
                      <img
                        src={rec.image_url}
                        alt={rec.name}
                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-36 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <ShoppingCart className="h-8 w-8 text-white/60" />
                      </div>
                    )}
                  </Link>
                  <div className="p-3">
                    <Link to={`/products/${rec.id}`}>
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 hover:text-indigo-600 transition-colors">
                        {rec.name}
                      </h4>
                    </Link>
                    <p className="text-base font-bold text-gray-900 mt-1 mb-2">
                      &#8377;{rec.price.toLocaleString('en-IN')}
                    </p>
                    <button
                      onClick={() => handleRecommendationAddToCart(rec.id)}
                      disabled={rec.stock_quantity === 0}
                      className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 text-white rounded-lg py-2 text-xs font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Viewed */}
        <div className="mt-12">
          <RecentlyViewed excludeId={productId} maxItems={8} />
        </div>

        {/* Reviews Section */}
        <ReviewSection productId={productId} />
      </div>
    </div>
  );
}
