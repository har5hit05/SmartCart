import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { aiAPI } from '../api/client';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface Suggestion {
  id: number;
  name: string;
  price: number;
  category: string;
}

export default function CartPage() {
  const { items, summary, loading, updateQuantity, removeItem, clearCart, addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (items.length > 0) {
      const ids = items.map(i => i.product_id);
      aiAPI.cartSuggestions(ids)
        .then(res => setSuggestions(res.data.data || []))
        .catch(() => {});
    }
  }, [items]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Please login to view your cart</h2>
        <Link to="/login" className="text-indigo-600 hover:underline">Login →</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add some products to get started!</p>
        <Link to="/products" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition">
          Browse Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Shopping Cart ({summary.itemCount} items)</h1>
        <button onClick={() => { clearCart(); toast.success('Cart cleared'); }}
          className="text-sm text-red-600 hover:underline">Clear Cart</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.product_id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_id}`} className="font-semibold text-gray-900 hover:text-indigo-600 line-clamp-1">
                  {item.product.name}
                </Link>
                <p className="text-sm text-gray-500">{item.product.category}</p>
                <p className="text-indigo-700 font-bold mt-1">₹{item.product.price}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => { removeItem(item.product_id); toast.success('Removed'); }}
                  className="text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg">
                  <button onClick={() => item.quantity > 1 && updateQuantity(item.product_id, item.quantity - 1)}
                    className="p-1.5 hover:bg-gray-200 rounded-l-lg transition" disabled={item.quantity <= 1}>
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    className="p-1.5 hover:bg-gray-200 rounded-r-lg transition">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-gray-700">₹{item.subtotal.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{summary.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tax (18% GST)</span><span>₹{summary.tax.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span>
                <span>{summary.shippingFee === 0 ? <span className="text-green-600">Free</span> : `₹${summary.shippingFee}`}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Total</span><span className="text-indigo-700">₹{summary.total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => navigate('/checkout')}
              className="w-full mt-6 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2">
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>
            {summary.shippingFee > 0 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Add ₹{(500 - summary.subtotal).toFixed(2)} more for free shipping
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">AI Recommended for You</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {suggestions.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition">
                <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg mb-3 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-300" />
                </div>
                <p className="text-xs text-indigo-600 font-medium">{p.category}</p>
                <h4 className="font-semibold text-sm text-gray-900 line-clamp-1">{p.name}</h4>
                <p className="text-indigo-700 font-bold text-sm mt-1">₹{p.price}</p>
                <button onClick={() => { addToCart(p.id); toast.success('Added to cart'); }}
                  className="mt-2 w-full text-xs bg-indigo-50 text-indigo-700 font-medium py-1.5 rounded-lg hover:bg-indigo-100 transition">
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
