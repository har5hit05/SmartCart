import axios from 'axios';

// In dev: Vite proxy handles /api → localhost:3000
// In prod: Use full backend URL from env variable
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip token refresh for auth endpoints (me, login, register, refresh, logout)
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

// Products
export const productAPI = {
  getAll: (params?: Record<string, any>) => api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  search: (q: string) => api.get('/products/search', { params: { q } }),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// Cart
export const cartAPI = {
  get: () => api.get('/cart'),
  getCount: () => api.get('/cart/count'),
  add: (product_id: number, quantity: number) =>
    api.post('/cart', { product_id, quantity }),
  update: (productId: number, quantity: number) =>
    api.put(`/cart/${productId}`, { quantity }),
  remove: (productId: number) => api.delete(`/cart/${productId}`),
  clear: () => api.delete('/cart'),
};

// Orders
export const orderAPI = {
  create: (data: any) => api.post('/orders', data),
  getAll: (params?: Record<string, any>) => api.get('/orders', { params }),
  getAllAdmin: (params?: Record<string, any>) => api.get('/orders/all', { params }),
  getById: (id: number) => api.get(`/orders/${id}`),
  getHistory: (id: number) => api.get(`/orders/${id}/history`),
  updateStatus: (id: number, data: any) => api.put(`/orders/${id}/status`, data),
  cancel: (id: number) => api.post(`/orders/${id}/cancel`),
  downloadInvoice: (id: number) =>
    api.get(`/orders/${id}/invoice`, { responseType: 'blob' }),
};

// AI
export const aiAPI = {
  search: (q: string, limit?: number) =>
    api.get('/ai/search', { params: { q, limit } }),
  recommendations: (productId: number) =>
    api.get(`/ai/recommendations/${productId}`),
  cartSuggestions: (productIds: number[]) =>
    api.post('/ai/cart-suggestions', { productIds }),
  chat: (message: string, conversationHistory: any[] = []) =>
    api.post('/ai/chat', { message, conversationHistory }),
};

// Reviews
export const reviewAPI = {
  getProductReviews: (productId: number, params?: Record<string, any>) =>
    api.get(`/products/${productId}/reviews`, { params }),
  getMyReview: (productId: number) =>
    api.get(`/products/${productId}/reviews/mine`),
  create: (productId: number, data: { rating: number; title?: string; comment?: string }) =>
    api.post(`/products/${productId}/reviews`, data),
  update: (reviewId: number, data: { rating?: number; title?: string; comment?: string }) =>
    api.put(`/reviews/${reviewId}`, data),
  delete: (reviewId: number) => api.delete(`/reviews/${reviewId}`),
  markHelpful: (reviewId: number) => api.post(`/reviews/${reviewId}/helpful`),
};

// Wishlist
export const wishlistAPI = {
  getAll: () => api.get('/wishlist'),
  add: (productId: number) => api.post('/wishlist', { product_id: productId }),
  remove: (productId: number) => api.delete(`/wishlist/${productId}`),
  check: (productId: number) => api.get(`/wishlist/check/${productId}`),
};

// Coupons
export const couponAPI = {
  getAvailable: () => api.get('/coupons/available'),
  validate: (code: string, order_total: number) =>
    api.post('/coupons/validate', { code, order_total }),
};

// Stock Alerts
export const stockAlertAPI = {
  subscribe: (productId: number) => api.post(`/stock-alerts/${productId}/subscribe`),
  unsubscribe: (productId: number) => api.delete(`/stock-alerts/${productId}/unsubscribe`),
  checkStatus: (productId: number) => api.get(`/stock-alerts/${productId}/status`),
  getMyAlerts: () => api.get('/stock-alerts'),
};

// Notifications
export const notificationAPI = {
  getAll: (page?: number, limit?: number) => api.get('/notifications', { params: { page, limit } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Payments
export const paymentAPI = {
  getMethods: () => api.get('/payments/methods'),
  initiate: (data: any) => api.post('/payments/initiate', data),
  verify: (data: {
    pending_id: number;
    provider_order_id: string;
    provider_payment_id: string;
    provider_signature?: string;
  }) => api.post('/payments/verify', data),
  refund: (orderId: number) => api.post(`/payments/${orderId}/refund`),
};

// Admin
export const adminAPI = {
  dashboard: () => api.get('/admin/analytics/dashboard'),
  analyticsUsers: () => api.get('/admin/analytics/users'),
  users: (params?: Record<string, any>) => api.get('/admin/users', { params }),
  userById: (id: number) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id: number, is_active: boolean) => api.put(`/admin/users/${id}/status`, { is_active }),
  orders: (params?: Record<string, any>) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id: number, status: string) => api.put(`/admin/orders/${id}/status`, { status }),
};

export default api;
