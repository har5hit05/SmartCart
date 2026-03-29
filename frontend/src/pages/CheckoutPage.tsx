import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { paymentAPI, couponAPI } from '../api/client';
import {
  ArrowLeft, CreditCard, Banknote, Smartphone, Globe,
  Tag, X, Check, ChevronDown, ChevronUp, Shield, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CouponInfo {
  coupon_id: number;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}

interface AvailableCoupon {
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_discount?: number;
  expires_at?: string;
}

interface PaymentMethodInfo {
  method: string;
  label: string;
  provider: string;
  icon: string;
  available: boolean;
}

const ICON_MAP: Record<string, any> = {
  banknote: Banknote,
  smartphone: Smartphone,
  'credit-card': CreditCard,
  globe: Globe,
};

// Load Razorpay SDK dynamically
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { items, summary, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'verifying'>('form');
  const [form, setForm] = useState({
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    shipping_phone: '',
    payment_method: 'COD' as string,
    customer_notes: '',
  });

  // Payment methods from API
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponInfo | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [showCoupons, setShowCoupons] = useState(false);

  useEffect(() => {
    // Load available payment methods and coupons in parallel
    paymentAPI.getMethods()
      .then((res) => {
        const methods = res.data.data || [];
        setPaymentMethods(methods);
        // Default to first available method
        const firstAvailable = methods.find((m: PaymentMethodInfo) => m.available);
        if (firstAvailable) {
          setForm(prev => ({ ...prev, payment_method: firstAvailable.method }));
        }
      })
      .catch(() => {
        // Fallback to COD only if API fails
        setPaymentMethods([
          { method: 'COD', label: 'Cash on Delivery', provider: 'cod', icon: 'banknote', available: true },
        ]);
      });

    couponAPI.getAvailable()
      .then((res) => setAvailableCoupons(res.data.data || []))
      .catch(() => {});
  }, []);

  if (!user) return <div className="text-center py-20"><Link to="/login" className="text-indigo-600">Login to checkout</Link></div>;
  if (items.length === 0) return <div className="text-center py-20"><Link to="/products" className="text-indigo-600">Add items to cart first</Link></div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApplyCoupon = async (code?: string) => {
    const applyCode = (code || couponCode).trim().toUpperCase();
    if (!applyCode) {
      toast.error('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    try {
      const res = await couponAPI.validate(applyCode, summary.subtotal);
      if (res.data.success) {
        setAppliedCoupon(res.data.data);
        setCouponCode(applyCode);
        setShowCoupons(false);
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('Coupon removed');
  };

  const discountAmount = appliedCoupon?.discount_amount || 0;
  const finalTotal = Math.max(0, summary.total - discountAmount);

  const selectedMethod = paymentMethods.find(m => m.method === form.payment_method);
  const isOnlinePayment = selectedMethod?.provider !== 'cod';

  // ─── Razorpay Checkout Flow ───────────────────────────────────────
  const handleRazorpayPayment = async (clientData: any, pendingId: number) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error('Failed to load Razorpay. Check your internet connection.');
      setSubmitting(false);
      setPaymentStep('form');
      return;
    }

    const options = {
      key: clientData.key_id,
      amount: clientData.amount,
      currency: clientData.currency,
      name: clientData.name || 'SmartCart',
      description: clientData.description || 'Order Payment',
      order_id: clientData.order_id,
      prefill: clientData.prefill || {},
      theme: { color: '#4f46e5' },
      handler: async (response: any) => {
        // Payment successful — verify on backend
        setPaymentStep('verifying');
        try {
          const verifyRes = await paymentAPI.verify({
            pending_id: pendingId,
            provider_order_id: response.razorpay_order_id,
            provider_payment_id: response.razorpay_payment_id,
            provider_signature: response.razorpay_signature,
          });

          await refreshCart();
          toast.success('Payment successful! Order placed.');
          navigate(`/orders/${verifyRes.data.data.order_id}`);
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Payment verification failed');
          setPaymentStep('form');
        } finally {
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => {
          toast.error('Payment cancelled');
          setSubmitting(false);
          setPaymentStep('form');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', (response: any) => {
      toast.error(response.error?.description || 'Payment failed');
      setSubmitting(false);
      setPaymentStep('form');
    });
    razorpay.open();
  };

  // ─── Main Submit Handler ──────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.shipping_address_line1 || !form.shipping_city || !form.shipping_state || !form.shipping_postal_code || !form.shipping_phone) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    setPaymentStep('processing');

    try {
      const orderData = {
        ...form,
        ...(appliedCoupon ? { coupon_id: appliedCoupon.coupon_id, discount_amount: discountAmount } : {}),
      };

      // Initiate payment through the payment gateway
      const res = await paymentAPI.initiate(orderData);
      const data = res.data.data;

      if (form.payment_method === 'COD') {
        // COD: order already created by backend
        await refreshCart();
        toast.success('Order placed successfully!');
        navigate(`/orders/${data.smartcart_order_id}`);
        return;
      }

      const provider = selectedMethod?.provider;

      if (provider === 'razorpay') {
        // Open Razorpay checkout popup
        await handleRazorpayPayment(data.client_data, data.client_data.pending_id);
      } else if (provider === 'stripe') {
        // For Stripe: redirect to verification (simplified — Stripe Elements would be a full integration)
        // In production, you'd use @stripe/stripe-js and Stripe Elements here
        setPaymentStep('verifying');
        toast.error('Stripe integration requires test API keys. Please use Razorpay or COD for now.');
        setPaymentStep('form');
        setSubmitting(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment failed');
      setPaymentStep('form');
      setSubmitting(false);
    }
  };

  // ─── Payment Processing Overlay ───────────────────────────────────
  if (paymentStep === 'processing' || paymentStep === 'verifying') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {paymentStep === 'processing' ? 'Initiating Payment...' : 'Verifying Payment...'}
          </h3>
          <p className="text-sm text-gray-500">
            {paymentStep === 'processing'
              ? 'Please wait while we set up your payment.'
              : 'Confirming your payment with the provider. Do not close this window.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Secured with 256-bit encryption</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6 text-sm cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Shipping Address</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                <input name="shipping_address_line1" value={form.shipping_address_line1} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="House/Flat No., Street" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input name="shipping_address_line2" value={form.shipping_address_line2} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="Landmark, Area" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input name="shipping_city" value={form.shipping_city} onChange={handleChange} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input name="shipping_state" value={form.shipping_state} onChange={handleChange} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                  <input name="shipping_postal_code" value={form.shipping_postal_code} onChange={handleChange} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input name="shipping_phone" value={form.shipping_phone} onChange={handleChange} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
            </div>
          </div>

          {/* Coupon Code */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-600" />
              Apply Coupon
            </h3>

            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <span className="font-semibold text-green-800">{appliedCoupon.code}</span>
                    <p className="text-xs text-green-600">{appliedCoupon.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-green-700">-₹{discountAmount.toFixed(2)}</span>
                  <button type="button" onClick={handleRemoveCoupon} className="text-gray-400 hover:text-red-500 transition cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </button>
                </div>

                {availableCoupons.length > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowCoupons(!showCoupons)}
                      className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                    >
                      {showCoupons ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {showCoupons ? 'Hide' : 'View'} available coupons ({availableCoupons.length})
                    </button>

                    {showCoupons && (
                      <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                        {availableCoupons.map((c) => (
                          <div
                            key={c.code}
                            className="flex items-center justify-between border border-dashed border-gray-300 rounded-lg p-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                  {c.code}
                                </span>
                                <span className="text-xs font-medium text-gray-500">
                                  {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{c.description}</p>
                              {Number(c.min_order_value) > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">Min. order: ₹{c.min_order_value}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplyCoupon(c.code)}
                              disabled={couponLoading}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer whitespace-nowrap px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                            >
                              Apply
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
            <div className="grid gap-3">
              {paymentMethods.filter(pm => pm.available).map(pm => {
                const IconComponent = ICON_MAP[pm.icon] || CreditCard;
                return (
                  <label
                    key={pm.method}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      form.payment_method === pm.method
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={pm.method}
                      checked={form.payment_method === pm.method}
                      onChange={handleChange}
                      className="text-indigo-600"
                    />
                    <IconComponent className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{pm.label}</span>
                      {pm.provider !== 'cod' && (
                        <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          via {pm.provider === 'razorpay' ? 'Razorpay' : 'Stripe'}
                        </span>
                      )}
                    </div>
                    {pm.provider !== 'cod' && (
                      <Shield className="w-4 h-4 text-green-500" />
                    )}
                  </label>
                );
              })}
            </div>

            {/* Payment method info */}
            {isOnlinePayment && (
              <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-indigo-600 mt-0.5" />
                  <div className="text-xs text-indigo-700">
                    <p className="font-medium">Secure Payment</p>
                    <p className="mt-0.5 text-indigo-600">
                      {selectedMethod?.provider === 'razorpay'
                        ? 'You\'ll be redirected to Razorpay\'s secure checkout. Supports UPI, cards, wallets, and net banking.'
                        : 'Your card details are encrypted and processed securely by Stripe.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order Notes (Optional)</h3>
            <textarea name="customer_notes" value={form.customer_notes} onChange={handleChange} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" placeholder="Any special instructions..." />
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm mb-4">
              {items.map(item => (
                <div key={item.product_id} className="flex justify-between">
                  <span className="text-gray-600 line-clamp-1 flex-1">{item.product.name} x {item.quantity}</span>
                  <span className="ml-2 font-medium">₹{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{summary.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tax (18% GST)</span><span>₹{summary.tax.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span>
                <span>{summary.shippingFee === 0 ? <span className="text-green-600">Free</span> : `₹${summary.shippingFee}`}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Coupon ({appliedCoupon?.code})</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Total</span><span className="text-indigo-700">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full mt-6 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              {submitting
                ? 'Processing...'
                : isOnlinePayment
                  ? `Pay ₹${finalTotal.toFixed(2)}`
                  : `Place Order — ₹${finalTotal.toFixed(2)}`
              }
            </button>

            {isOnlinePayment && (
              <p className="text-xs text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Secured by {selectedMethod?.provider === 'razorpay' ? 'Razorpay' : 'Stripe'}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
