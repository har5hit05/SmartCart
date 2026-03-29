import { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  User,
  Menu,
  X,
  LogOut,
  Package,
  LayoutDashboard,
  Heart,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { productAPI } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch suggestions on debounced search
  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSuggestionsLoading(true);
    productAPI.getAll({ search: debouncedSearch, limit: 5 })
      .then((res) => {
        const data = res.data.data;
        const products = Array.isArray(data) ? data : data.products || [];
        setSuggestions(products);
        setShowSuggestions(products.length > 0);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [debouncedSearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (trimmed) {
      navigate(`/products?search=${encodeURIComponent(trimmed)}`);
      setSearchTerm('');
      setMobileOpen(false);
    }
  }

  async function handleLogout() {
    await logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate('/');
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <ShoppingCart className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">SmartCart</span>
          </Link>

          {/* Search - desktop with autocomplete */}
          <form
            onSubmit={handleSearch}
            className="hidden flex-1 items-center justify-center md:flex"
          >
            <div className="relative w-full max-w-lg" ref={searchRef}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search products..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {/* Autocomplete dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-50 overflow-hidden dark:bg-gray-800 dark:border-gray-600">
                  {suggestions.map((product: any) => (
                    <Link
                      key={product.id}
                      to={`/products/${product.id}`}
                      onClick={() => { setShowSuggestions(false); setSearchTerm(''); }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-indigo-100 flex items-center justify-center">
                          <Search className="h-3 w-3 text-indigo-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.category} &middot; ₹{Number(product.price).toLocaleString('en-IN')}</p>
                      </div>
                    </Link>
                  ))}
                  <Link
                    to={`/products?search=${encodeURIComponent(searchTerm)}`}
                    onClick={() => { setShowSuggestions(false); setSearchTerm(''); }}
                    className="block px-4 py-2.5 text-center text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-600"
                  >
                    View all results for "{searchTerm}"
                  </Link>
                </div>
              )}
            </div>
          </form>

          {/* Right side - desktop */}
          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer"
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {user && (
              <>
                <Link
                  to="/wishlist"
                  className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-pink-500"
                  title="Wishlist"
                >
                  <Heart className="h-5 w-5" />
                </Link>
                <NotificationBell />
              </>
            )}
            <Link
              to="/cart"
              className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-indigo-600"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  <User className="h-4 w-4" />
                  <span className="max-w-[120px] truncate">{user.full_name}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <Link
                      to="/wishlist"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Heart className="h-4 w-4" />
                      My Wishlist
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Package className="h-4 w-4" />
                      My Orders
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: cart + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/cart"
              className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="space-y-3 px-4 py-4">
            {/* Mobile search */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </form>

            {user ? (
              <>
                <div className="flex items-center gap-2 px-2 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  {user.full_name}
                </div>
                <Link
                  to="/orders"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Package className="h-4 w-4" />
                  My Orders
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
