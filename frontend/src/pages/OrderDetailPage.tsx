import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { orderAPI } from '../api/client';
import { ArrowLeft, Package, CheckCircle, Truck, Clock, XCircle, MapPin, CreditCard, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const statusSteps = ['PLACED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED'];
const statusIcons: Record<string, any> = {
  PLACED: Clock, CONFIRMED: CheckCircle, PREPARING: Package, DISPATCHED: Truck, DELIVERED: CheckCircle, CANCELLED: XCircle,
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      orderAPI.getById(parseInt(id)),
      orderAPI.getHistory(parseInt(id)),
    ]).then(([orderRes, historyRes]) => {
      setOrder(orderRes.data.data);
      setHistory(historyRes.data.data);
    }).catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadInvoice = async () => {
    try {
      const res = await orderAPI.downloadInvoice(parseInt(id!));
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SmartCart-Invoice-${String(order?.id || id).padStart(6, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice downloaded!');
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await orderAPI.cancel(parseInt(id!));
      toast.success('Order cancelled');
      setOrder((prev: any) => ({ ...prev, status: 'CANCELLED' }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  if (loading) {
    return <div className="text-center py-20"><div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" /></div>;
  }

  if (!order) {
    return <div className="text-center py-20 text-gray-500">Order not found</div>;
  }

  const currentStep = statusSteps.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownloadInvoice} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 transition cursor-pointer">
            <Download className="h-4 w-4" /> Invoice
          </button>
        {['PLACED', 'CONFIRMED'].includes(order.status) && (
          <button onClick={handleCancel} className="text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition cursor-pointer">
            Cancel Order
          </button>
        )}
        </div>
      </div>

      {/* Status Tracker */}
      {!isCancelled && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-6">Order Status</h3>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
            <div className="absolute top-5 left-0 h-0.5 bg-indigo-600 transition-all" style={{ width: `${Math.max(0, currentStep) / (statusSteps.length - 1) * 100}%` }} />
            {statusSteps.map((step, i) => {
              const Icon = statusIcons[step] || Clock;
              const isActive = i <= currentStep;
              return (
                <div key={step} className="relative z-10 flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 font-medium ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 font-medium">This order has been {order.status.toLowerCase()}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Shipping */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Shipping Address</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>{order.shipping_address_line1}</p>
            {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
            <p>{order.shipping_city}, {order.shipping_state} - {order.shipping_postal_code}</p>
            <p>Phone: {order.shipping_phone}</p>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Payment</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Method: <span className="font-medium">{order.payment_method}</span></p>
            <p>Status: <span className="font-medium">{order.payment_status}</span></p>
            {order.tracking_number && <p>Tracking: <span className="font-medium">{order.tracking_number}</span></p>}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
        <div className="divide-y">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 py-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-indigo-300" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                <p className="text-xs text-gray-500">₹{item.unit_price} × {item.quantity}</p>
              </div>
              <p className="font-semibold text-sm">₹{parseFloat(item.subtotal).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="border-t mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{parseFloat(order.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>₹{parseFloat(order.tax).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{parseFloat(order.shipping_fee) === 0 ? 'Free' : `₹${parseFloat(order.shipping_fee).toFixed(2)}`}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span className="text-indigo-700">₹{parseFloat(order.total).toFixed(2)}</span></div>
        </div>
      </div>

      {/* Status History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Status History</h3>
          <div className="space-y-3">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{h.status}</p>
                  {h.notes && <p className="text-xs text-gray-500">{h.notes}</p>}
                  <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
