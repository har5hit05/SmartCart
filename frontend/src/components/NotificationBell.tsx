/**
 * NotificationBell Component
 *
 * Displays a bell icon in the Navbar with unread count badge.
 * Uses Socket.io for REAL-TIME updates + polling as fallback.
 * Dropdown shows recent notifications (order updates, payment, back-in-stock, etc.)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Package, CreditCard, ShoppingCart, AlertTriangle, X, Check, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { notificationAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string | null;
  data: any;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // ─── Socket.io Connection for Real-Time Events ──────────────────────────

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

    const socket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // ── Real-time notification count updates ──
    socket.on('notification:countUpdate', (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    // ── Order events ──
    socket.on('order:confirmed', (data: { orderId: number; message: string }) => {
      toast.success(data.message, { duration: 5000, icon: '🎉' });
      refreshNotifications();
    });

    socket.on('order:statusUpdate', (data: { orderId: number; newStatus: string; message: string }) => {
      toast(data.message || `Order #${data.orderId} → ${data.newStatus}`, {
        duration: 5000,
        icon: getStatusIcon(data.newStatus),
      });
      refreshNotifications();
    });

    socket.on('order:cancelled', (data: { orderId: number; refundInitiated: boolean }) => {
      toast(
        data.refundInitiated
          ? `Order #${data.orderId} cancelled. Refund will be processed.`
          : `Order #${data.orderId} has been cancelled.`,
        { duration: 5000, icon: '❌' }
      );
      refreshNotifications();
    });

    // ── Payment events ──
    socket.on('payment:success', (data: { orderId: number; amount: number; provider: string }) => {
      toast.success(`Payment of ₹${data.amount.toFixed(2)} confirmed!`, { duration: 5000, icon: '💳' });
      refreshNotifications();
    });

    socket.on('payment:failed', (data: { error: string }) => {
      toast.error(`Payment failed: ${data.error}`, { duration: 5000 });
    });

    // ── Stock alerts ──
    socket.on('notification:backInStock', (data: { productName: string; productId: number }) => {
      toast(`"${data.productName}" is back in stock!`, {
        duration: 6000,
        icon: '🔔',
      });
      refreshNotifications();
    });

    socket.on('connect', () => {
      console.log('Notification socket connected');
    });

    socket.on('connect_error', () => {
      // Silently fall back to polling
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // ─── Helper: refresh notifications + count ──────────────────────────────

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.data.count);
      // If dropdown is open, also refresh the list
      if (open) {
        const listRes = await notificationAPI.getAll(1, 10);
        setNotifications(listRes.data.data.notifications);
      }
    } catch {}
  }, [user, open]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.data.count);
    } catch {}
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationAPI.getAll(1, 10);
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unreadCount);
    } catch {}
    setLoading(false);
  }, [user]);

  // Polling fallback — every 30 seconds (Socket.io handles real-time updates)
  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const formatTime = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    !notif.is_read ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${getNotifIconStyle(notif.type)}`}>
                    {getNotifIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{notif.title}</p>
                    {notif.message && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">{formatTime(notif.created_at)}</span>
                      {notif.data?.product_id && (
                        <Link
                          to={`/products/${notif.data.product_id}`}
                          onClick={() => setOpen(false)}
                          className="text-[10px] text-indigo-600 hover:underline font-medium"
                        >
                          View Product
                        </Link>
                      )}
                      {notif.data?.order_id && (
                        <Link
                          to={`/orders/${notif.data.order_id}`}
                          onClick={() => setOpen(false)}
                          className="text-[10px] text-indigo-600 hover:underline font-medium"
                        >
                          View Order
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Mark as read */}
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      className="shrink-0 p-1 text-gray-400 hover:text-green-600 rounded transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper functions for notification type styling ───────────────────────

function getNotifIcon(type: string) {
  switch (type) {
    case 'back_in_stock':
      return <Package className="h-4 w-4" />;
    case 'payment_success':
      return <CreditCard className="h-4 w-4" />;
    case 'order_status':
      return <ShoppingCart className="h-4 w-4" />;
    case 'order_cancelled':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getNotifIconStyle(type: string) {
  switch (type) {
    case 'back_in_stock':
      return 'bg-green-100 text-green-600';
    case 'payment_success':
      return 'bg-blue-100 text-blue-600';
    case 'order_status':
      return 'bg-indigo-100 text-indigo-600';
    case 'order_cancelled':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'CONFIRMED': return '✅';
    case 'PREPARING': return '📦';
    case 'DISPATCHED': return '🚚';
    case 'DELIVERED': return '🎉';
    case 'REFUNDED': return '💰';
    default: return '📋';
  }
}
