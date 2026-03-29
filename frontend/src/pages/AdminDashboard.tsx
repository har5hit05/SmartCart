import { useState, useEffect, useRef } from 'react';
import { adminAPI, orderAPI } from '../api/client';
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, Clock, Activity, Zap, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { io, Socket } from 'socket.io-client';

interface LiveEvent {
  id: string;
  type: 'order' | 'payment' | 'stock' | 'review' | 'product';
  icon: string;
  message: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    adminAPI.dashboard()
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ─── Socket.io for Admin Real-Time Events Feed ──────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

    const socket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    const addEvent = (event: Omit<LiveEvent, 'id' | 'timestamp'>) => {
      setLiveEvents(prev => [{
        ...event,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 20)); // Keep last 20 events
    };

    // Listen to admin events
    socket.on('order:new', (d: any) => {
      addEvent({ type: 'order', icon: '🛒', message: `New order #${d.orderId} — ₹${d.total?.toFixed(2) || '?'} (${d.itemCount || '?'} items)` });
    });

    socket.on('order:statusUpdate', (d: any) => {
      addEvent({ type: 'order', icon: '📋', message: `Order #${d.orderId} → ${d.newStatus} (by ${d.updatedBy || 'system'})` });
    });

    socket.on('order:cancelled', (d: any) => {
      addEvent({ type: 'order', icon: '❌', message: `Order #${d.orderId} cancelled by ${d.cancelledBy}` });
    });

    socket.on('stock:updated', (d: any) => {
      addEvent({ type: 'stock', icon: '📦', message: `${d.productName}: stock ${d.oldQuantity} → ${d.newQuantity} (${d.reason})` });
    });

    socket.on('stock:low', (d: any) => {
      addEvent({ type: 'stock', icon: '⚠️', message: `LOW STOCK: "${d.productName}" — only ${d.currentQuantity} left!` });
    });

    socket.on('product:created', (d: any) => {
      addEvent({ type: 'product', icon: '✨', message: `New product: "${d.productName}" — ₹${d.price}` });
    });

    socket.on('product:updated', (d: any) => {
      addEvent({ type: 'product', icon: '✏️', message: `Product updated: "${d.productName}" (${d.changes?.join(', ')})` });
    });

    socket.on('review:created', (d: any) => {
      addEvent({ type: 'review', icon: '⭐', message: `New ${d.rating}★ review for "${d.productName}"` });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  if (loading) {
    return <div className="text-center py-20"><div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-gray-500">Failed to load analytics</div>;
  }

  const statCards = [
    { label: 'Total Users', value: data.overview.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Products', value: data.overview.totalProducts, icon: Package, color: 'bg-purple-50 text-purple-600' },
    { label: 'Total Orders', value: data.overview.totalOrders, icon: ShoppingCart, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Revenue', value: `₹${data.overview.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
  ];

  const statusColors: Record<string, string> = {
    PLACED: 'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-indigo-100 text-indigo-700',
    PREPARING: 'bg-amber-100 text-amber-700',
    DISPATCHED: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your store performance</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{card.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> Revenue (Last 30 Days)
          </h3>
          {data.dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`₹${parseFloat(v).toFixed(2)}`, 'Revenue']} labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN')} />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-16">No revenue data yet</p>
          )}
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Orders by Status</h3>
          {data.ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.ordersByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-16">No orders yet</p>
          )}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Live Activity Feed
          </h3>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {liveEvents.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Real-time events will appear here</p>
            <p className="text-gray-300 text-xs mt-1">Place an order, update stock, or create a product to see events</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {liveEvents.map((event) => (
              <div
                key={event.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  event.type === 'stock' && event.message.includes('LOW STOCK')
                    ? 'bg-red-50 border border-red-100'
                    : 'bg-gray-50'
                }`}
              >
                <span className="text-base shrink-0">{event.icon}</span>
                <span className="flex-1 text-gray-700">{event.message}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Products</h3>
          {data.topProducts.length > 0 ? (
            <div className="space-y-3">
              {data.topProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-900">{p.product_name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">₹{parseFloat(p.total_revenue).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{p.total_sold} sold</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No sales data yet</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Orders</h3>
          {data.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {data.recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{o.id} - {o.full_name}</p>
                    <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{parseFloat(o.total).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
