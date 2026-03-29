import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ShoppingCart, Filter, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { productAPI, aiAPI } from '../api/client';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  stock_quantity: number;
  is_active: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [aiSearch, setAiSearch] = useState(false);

  // Read filters from URL params
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sortBy') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Local filter state for controlled inputs
  const [searchInput, setSearchInput] = useState(search);
  const [categoryInput, setCategoryInput] = useState(category);
  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);
  const [sortByInput, setSortByInput] = useState(sortBy);

  // Sync local state when URL params change externally
  useEffect(() => {
    setSearchInput(search);
    setCategoryInput(category);
    setMinPriceInput(minPrice);
    setMaxPriceInput(maxPrice);
    setSortByInput(sortBy);
  }, [search, category, minPrice, maxPrice, sortBy]);

  // Fetch categories on mount
  useEffect(() => {
    productAPI.getCategories()
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  // Fetch products whenever URL params change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        if (aiSearch && search.trim()) {
          const res = await aiAPI.search(search, 20);
          const data = res.data.data;
          setProducts(Array.isArray(data) ? data : data.products || []);
          setTotalPages(1);
        } else {
          const params: Record<string, any> = { page, limit: 12 };
          if (search) params.search = search;
          if (category) params.category = category;
          if (minPrice) params.minPrice = minPrice;
          if (maxPrice) params.maxPrice = maxPrice;
          if (sortBy) params.sortBy = sortBy;

          const res = await productAPI.getAll(params);
          const data = res.data.data;
          setProducts(data.products || data || []);
          setTotalPages(data.totalPages || data.pagination?.totalPages || 1);
        }
      } catch {
        toast.error('Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [search, category, minPrice, maxPrice, sortBy, page, aiSearch]);

  const updateParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    // Reset to page 1 when filters change (unless we're explicitly setting page)
    if (!('page' in updates)) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput });
  };

  const applyFilters = () => {
    updateParams({
      category: categoryInput,
      minPrice: minPriceInput,
      maxPrice: maxPriceInput,
      sortBy: sortByInput,
    });
  };

  const clearFilters = () => {
    setCategoryInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setSortByInput('');
    setSearchParams(new URLSearchParams());
  };

  const handleAddToCart = async (productId: number) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }
    setAddingToCart(productId);
    try {
      await addToCart(productId, 1);
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const FilterPanel = () => (
    <div className="space-y-5">
      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
        <select
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder="Max"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            className="w-1/2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Sort By */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sort By</label>
        <select
          value={sortByInput}
          onChange={(e) => setSortByInput(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">Default</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
          <option value="price_asc">Price (Low to High)</option>
          <option value="price_desc">Price (High to Low)</option>
          <option value="created_at_desc">Newest First</option>
          <option value="created_at_asc">Oldest First</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={applyFilters}
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          Apply Filters
        </button>
        <button
          onClick={clearFilters}
          className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Search */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Products</h1>
          <form onSubmit={handleSearch} className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={aiSearch ? 'AI-powered search...' : 'Search products...'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Search
            </button>

            {/* AI Search Toggle */}
            <button
              type="button"
              onClick={() => setAiSearch(!aiSearch)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                aiSearch
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title="Toggle AI-powered search"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </button>

            {/* Mobile filter toggle */}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </form>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-2xl shadow-md p-5 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              <FilterPanel />
            </div>
          </aside>

          {/* Mobile Filters Panel */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <FilterPanel />
              </div>
            </div>
          )}

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
                <p className="text-gray-400">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      {/* Image */}
                      <Link to={`/products/${product.id}`}>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                            <ShoppingCart className="h-12 w-12 text-white/60" />
                          </div>
                        )}
                      </Link>

                      {/* Content */}
                      <div className="p-4">
                        <Link to={`/products/${product.id}`}>
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 hover:text-indigo-600 transition-colors">
                            {product.name}
                          </h3>
                        </Link>

                        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full mb-2">
                          {product.category}
                        </span>

                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-gray-900">
                            &#8377;{product.price.toLocaleString('en-IN')}
                          </span>
                          <span className={`text-xs font-medium ${
                            product.stock_quantity > 0 ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={product.stock_quantity === 0 || addingToCart === product.id}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          {addingToCart === product.id ? 'Adding...' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-10">
                    <button
                      onClick={() => updateParams({ page: String(page - 1) })}
                      disabled={page <= 1}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => updateParams({ page: String(page + 1) })}
                      disabled={page >= totalPages}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
