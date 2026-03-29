import { useState, useEffect, useCallback, Fragment } from 'react';
import { adminAPI } from '../../api/client';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['All', 'PLACED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;

const statusBadge: Record<string, string> = {
  PLACED: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-indigo-100 text-indigo-700',
  DISPATCHED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

// Only show valid next transitions for each status (matches DB constraint)
const allowedTransitions: Record<string, string[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

interface Order {
  id: number;
  full_name?: string;
  email?: string;
  user_name?: string;
  user_email?: string;
  total: string | number;
  status: string;
  created_at: string;
  items?: any[];
  shipping_address_line1?: string;
  shipping_city?: string;
  shipping_state?: string;
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const limit = 10;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (statusFilter !== 'All') params.status = statusFilter;
      const res = await adminAPI.orders(params);
      const data = res.data.data || res.data;
      setOrders(Array.isArray(data) ? data : data.orders || []);
      const pag = data.pagination || res.data.pagination;
      setTotalPages(pag?.totalPages || 1);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated');
      fetchOrders();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage customer orders</p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {status === 'All' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-8" />
                <th className="text-left px-4 py-3 font-medium text-gray-500">Order ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Customer</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">No orders found</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <Fragment key={order.id}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    >
                      <td className="px-4 py-3">
                        {expandedId === order.id
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-600">#{order.id}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div>
                          <p className="font-medium text-gray-900">{order.full_name || order.user_name || '-'}</p>
                          <p className="text-xs text-gray-500">{order.email || order.user_email || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        ₹{parseFloat(String(order.total)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusBadge[order.status] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {(allowedTransitions[order.status] || []).length > 0 ? (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) handleStatusUpdate(order.id, e.target.value);
                            }}
                            disabled={updatingId === order.id}
                            className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Change to...</option>
                            {(allowedTransitions[order.status] || []).map((s) => (
                              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-gray-400">No actions</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-details`}>
                        <td colSpan={7} className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer Details</h4>
                              <p className="text-sm text-gray-900">{order.full_name || order.user_name || '-'}</p>
                              <p className="text-sm text-gray-500">{order.email || order.user_email || '-'}</p>
                              {order.shipping_address_line1 && (
                                <p className="text-sm text-gray-500 mt-1">{[order.shipping_address_line1, order.shipping_city, order.shipping_state].filter(Boolean).join(', ')}</p>
                              )}
                            </div>
                            {order.items && order.items.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</h4>
                                <div className="space-y-1.5">
                                  {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                      <span className="text-gray-700">
                                        {item.product_name || item.name} x{item.quantity}
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        ₹{parseFloat(String(item.price || item.unit_price || 0) ).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
