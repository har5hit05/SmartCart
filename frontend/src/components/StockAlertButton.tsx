/**
 * StockAlertButton Component
 *
 * Shows a "Notify Me" button when a product is out of stock.
 * When clicked, subscribes the user to back-in-stock notifications.
 * Shows "Subscribed" state if already subscribed.
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { stockAlertAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface StockAlertButtonProps {
  productId: number;
  stockQuantity: number;
}

export default function StockAlertButton({ productId, stockQuantity }: StockAlertButtonProps) {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if user is already subscribed
  useEffect(() => {
    if (!user || stockQuantity > 0) {
      setChecking(false);
      return;
    }

    stockAlertAPI.checkStatus(productId)
      .then((res) => setSubscribed(res.data.data.subscribed))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [productId, user, stockQuantity]);

  // Don't show if product is in stock
  if (stockQuantity > 0) return null;

  // Don't show if not logged in
  if (!user) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
        <Bell className="h-4 w-4 shrink-0" />
        <span>Log in to get notified when this product is back in stock.</span>
      </div>
    );
  }

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await stockAlertAPI.unsubscribe(productId);
        setSubscribed(false);
        toast.success('You will no longer be notified for this product');
      } else {
        await stockAlertAPI.subscribe(productId);
        setSubscribed(true);
        toast.success('You\'ll be notified when this product is back in stock!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Checking alert status...</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
        subscribed
          ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
          : 'bg-amber-500 text-white hover:bg-amber-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {loading
        ? 'Processing...'
        : subscribed
          ? 'Subscribed — Click to Unsubscribe'
          : 'Notify Me When Back in Stock'}
    </button>
  );
}
