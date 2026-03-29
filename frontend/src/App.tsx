import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary, SectionErrorBoundary } from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

// Eagerly loaded pages (critical path)
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';

// Lazy loaded pages (code splitting)
const CartPage = lazy(() => import('./pages/CartPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const ChatBot = lazy(() => import('./components/ChatBot'));

// Admin pages (lazy - only loaded when admin navigates there)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ProductsManagement = lazy(() => import('./pages/admin/ProductsManagement'));
const ProductForm = lazy(() => import('./pages/admin/ProductForm'));
const OrdersManagement = lazy(() => import('./pages/admin/OrdersManagement'));
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      {children}
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />

          {/* Protected routes (lazy loaded) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/cart" element={<SuspenseWrapper><CartPage /></SuspenseWrapper>} />
            <Route path="/wishlist" element={<SuspenseWrapper><WishlistPage /></SuspenseWrapper>} />
            <Route path="/checkout" element={<SuspenseWrapper><CheckoutPage /></SuspenseWrapper>} />
            <Route path="/orders" element={<SuspenseWrapper><OrdersPage /></SuspenseWrapper>} />
            <Route path="/orders/:id" element={<SuspenseWrapper><OrderDetailPage /></SuspenseWrapper>} />
          </Route>

          {/* Admin routes (lazy loaded) */}
          <Route path="/admin" element={
            <SuspenseWrapper>
              <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
            </SuspenseWrapper>
          }>
            <Route index element={<SuspenseWrapper><AdminDashboard /></SuspenseWrapper>} />
            <Route path="products" element={<SuspenseWrapper><ProductsManagement /></SuspenseWrapper>} />
            <Route path="products/new" element={<SuspenseWrapper><ProductForm /></SuspenseWrapper>} />
            <Route path="products/:id/edit" element={<SuspenseWrapper><ProductForm /></SuspenseWrapper>} />
            <Route path="orders" element={<SuspenseWrapper><OrdersManagement /></SuspenseWrapper>} />
            <Route path="users" element={<SuspenseWrapper><UsersManagement /></SuspenseWrapper>} />
          </Route>
        </Route>
      </Routes>

      {/* AI Chatbot - visible on all pages */}
      <SectionErrorBoundary name="ChatBot">
        <SuspenseWrapper>
          <ChatBot />
        </SuspenseWrapper>
      </SectionErrorBoundary>
    </ErrorBoundary>
  );
}

export default App;
