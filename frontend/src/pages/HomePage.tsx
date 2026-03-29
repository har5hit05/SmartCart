import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productAPI } from '../api/client';
import { ShoppingBag, Sparkles, Search, TrendingUp, Shield, Truck } from 'lucide-react';
import RecentlyViewed from '../components/RecentlyViewed';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image_url?: string;
}

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    productAPI.getAll({ limit: 8, sortBy: 'created_at', sortOrder: 'desc' })
      .then(res => setFeatured(res.data.data.products))
      .catch(() => {});
    productAPI.getCategories()
      .then(res => setCategories(res.data.data))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Shopping Experience
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Shop Smarter with
            <span className="block text-amber-300">SmartCart AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
            Discover products with semantic search, get personalized recommendations,
            and chat with our AI assistant for the perfect shopping experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products" className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-indigo-50 transition">
              <ShoppingBag className="w-5 h-5" />
              Browse Products
            </Link>
            <Link to="/products?aiSearch=true" className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white font-semibold px-8 py-3.5 rounded-xl border border-white/20 hover:bg-white/20 transition">
              <Search className="w-5 h-5" />
              Try AI Search
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Sparkles, title: 'AI Semantic Search', desc: 'Find products using natural language. Our AI understands what you mean, not just what you type.' },
            { icon: TrendingUp, title: 'Smart Recommendations', desc: 'Get personalized product suggestions powered by vector embeddings and machine learning.' },
            { icon: Shield, title: 'Secure & Fast', desc: 'JWT authentication, rate limiting, Redis caching, and real-time WebSocket updates.' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map(cat => (
              <Link key={cat} to={`/products?category=${cat}`}
                className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition">
                {cat}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed Products */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <RecentlyViewed maxItems={8} />
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <Link to="/products" className="text-indigo-600 font-medium text-sm hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map(p => (
              <Link key={p.id} to={`/products/${p.id}`}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                <div className="aspect-square bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-indigo-300 group-hover:scale-110 transition" />
                </div>
                <div className="p-4">
                  <p className="text-xs text-indigo-600 font-medium mb-1">{p.category}</p>
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1">{p.name}</h3>
                  <p className="text-indigo-700 font-bold">₹{p.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tech Stack Banner */}
      <section className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400 mb-4">Built with modern technologies</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            {['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'pgvector', 'OpenAI', 'Redis', 'Socket.io', 'BullMQ', 'TailwindCSS', 'Docker'].map(t => (
              <span key={t} className="px-3 py-1 bg-white/10 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
