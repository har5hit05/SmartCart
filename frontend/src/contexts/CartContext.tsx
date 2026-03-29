import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { cartAPI } from '../api/client';
import { useAuth } from './AuthContext';

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    image_url?: string;
    category: string;
    stock_quantity: number;
    is_active: boolean;
  };
  subtotal: number;
}

interface CartSummary {
  itemCount: number;
  subtotal: number;
  tax: number;
  shippingFee: number;
  total: number;
}

interface CartContextType {
  items: CartItem[];
  summary: CartSummary;
  loading: boolean;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  itemCount: number;
}

const emptySum: CartSummary = { itemCount: 0, subtotal: 0, tax: 0, shippingFee: 0, total: 0 };

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>(emptySum);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setSummary(emptySum);
      return;
    }
    setLoading(true);
    try {
      const res = await cartAPI.get();
      setItems(res.data.data.items);
      setSummary(res.data.data.summary);
    } catch {
      setItems([]);
      setSummary(emptySum);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId: number, quantity = 1) => {
    await cartAPI.add(productId, quantity);
    await refreshCart();
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    await cartAPI.update(productId, quantity);
    await refreshCart();
  };

  const removeItem = async (productId: number) => {
    await cartAPI.remove(productId);
    await refreshCart();
  };

  const clearCart = async () => {
    await cartAPI.clear();
    await refreshCart();
  };

  return (
    <CartContext.Provider value={{
      items, summary, loading,
      addToCart, updateQuantity, removeItem, clearCart, refreshCart,
      itemCount: summary.itemCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
