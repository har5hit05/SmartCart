import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../api/client';
import { Package, ChevronRight, Clock } from 'lucide-react';

interface Order {
  id: number;
  status: string;
  total: number;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; unit_price: number }>;
}

const statusColors: Record<string, string> = {
  PLACED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-amber-100 text-amber-700',
  DISPATCHED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit: 10 };
    if (statusFilter) params.status = statusFilter;

    orderAPI.getAll(params)
      .then(res => {
        setOrders(res.data.data.orders);
        setTotalPages(res.data.data.pagination.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'PLACED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">No orders found</h2>
          <Link to="/products" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">Start shopping →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link key={order.id} to={`/orders/${order.id}`}
              className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">Order #{order.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition" />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Clock className="w-3.5 h-3.5" />
                {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {order.items.slice(0, 3).map((item, i) => (
                  <span key={i}>{i > 0 && ', '}{item.product_name} × {item.quantity}</span>
                ))}
                {order.items.length > 3 && <span className="text-gray-400"> +{order.items.length - 3} more</span>}
              </div>
              <p className="text-right font-bold text-indigo-700">₹{parseFloat(String(order.total)).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-50">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
