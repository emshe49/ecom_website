import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Heart,
  ShoppingCart,
  ShieldCheck,
  Zap,
  Package,
  Layers,
  Server,
  Database,
  CheckCircle2,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { useAuthStore } from '../features/auth/store/auth.store';
import { productSearchApi } from '../features/storefront/api/product-search.api';
import { ProductCard } from '../features/storefront/components/ProductCard';
import { api } from '../services/api';

interface HealthData {
  status: string;
  environment: string;
  uptime: number;
  timestamp: string;
  database: {
    isConnected: boolean;
    state: string;
  };
}

interface HealthResponse {
  success: boolean;
  data: HealthData;
}

export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [showArchitectureHealth, setShowArchitectureHealth] = useState(false);

  // 1. Fetch Featured / Latest Products
  const { data: featuredData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productSearchApi.getProducts({ limit: 8 }),
  });

  // 2. Fetch Categories & Brands for quick navigation
  const { data: facetsData } = useQuery({
    queryKey: ['home-facets'],
    queryFn: () => productSearchApi.getProductFacets(),
  });

  // 3. System health query
  const {
    data: healthResponse,
    isLoading: isLoadingHealth,
    isError: isHealthError,
    refetch: refetchHealth,
    isFetching: isFetchingHealth,
  } = useQuery<HealthResponse>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await api.get<HealthResponse>('/health');
      return response.data;
    },
    enabled: showArchitectureHealth,
  });

  const products = featuredData?.products || [];
  const categories = facetsData?.categories || [];
  const brands = facetsData?.brands || [];
  const health = healthResponse?.data;

  return (
    <div className="space-y-12 animate-fadeIn pb-12">
      {/* Authenticated Customer Welcome Bar */}
      {isAuthenticated && user && (
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md shadow-lg shadow-indigo-950/40">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-indigo-600/40">
              {user.firstName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Welcome back, {user.firstName}!
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Ready to explore our active store catalog and manage your cart.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/products"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Browse Catalog</span>
            </Link>
            <Link
              to="/wishlist"
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Wishlist</span>
            </Link>
            <Link
              to="/cart"
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cart</span>
            </Link>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <section className="relative rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/70 p-8 sm:p-12 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-16 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next-Gen E-Commerce Experience</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Discover Premium Products & Live Inventory
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Shop the latest electronics, apparel, and accessories with real-time stock reservations, authoritative pricing, and seamless checkout.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3.5">
            <Link
              to="/products"
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-bold shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore All Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/cart"
              className="px-5 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              <span>View Your Cart</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Category Discovery */}
      {categories.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              <span>Featured Categories</span>
            </h2>
            <Link
              to="/products"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View All Categories →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="group p-4 rounded-2xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-center transition-all duration-200"
              >
                <span className="block text-sm font-semibold text-slate-200 group-hover:text-indigo-300 truncate">
                  {cat.name}
                </span>
                <span className="block text-[11px] text-slate-400 mt-1">
                  {cat.count} {cat.count === 1 ? 'product' : 'products'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured / Catalog Products Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Popular & Trending Products</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Top-rated items with real-time warehouse availability.
            </p>
          </div>

          <Link
            to="/products"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 text-xs font-semibold border border-slate-800 transition-colors flex items-center gap-1.5"
          >
            <span>See All Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4 animate-pulse"
              >
                <div className="w-full aspect-square bg-slate-800 rounded-xl" />
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
                <div className="h-6 bg-slate-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Products Published Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No active products currently exist in the store catalog. You can log in as an administrator or staff member to create categories, brands, and products.
              </p>
            </div>
            {isAuthenticated && user?.role !== 'CUSTOMER' ? (
              <Link
                to="/admin/products/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
              >
                <span>Create New Product (Admin)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <span>Check Store Catalog</span>
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Featured Brands */}
      {brands.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-bold text-white">Shop by Brand</h2>
          <div className="flex flex-wrap gap-2.5">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                to={`/products?brand=${encodeURIComponent(brand.slug)}`}
                className="px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                {brand.name} ({brand.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Value Propositions / Storefront Features */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Live Stock Reservation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time atomic inventory reservation during checkout prevents overselling and duplicate orders.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Authoritative Pricing</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            All prices and line totals are verified on the backend in minor currency units to ensure absolute accuracy.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Heart className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Synced Wishlist</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Save favorite products across devices and easily transfer variants straight to your cart.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Address Snapshots</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Immutable fulfillment address snapshots ensure your shipments always arrive at the exact designated address.
          </p>
        </div>
      </section>

      {/* Developer / Evaluator Architecture & System Health (Collapsible) */}
      <section className="pt-6 border-t border-slate-900">
        <button
          type="button"
          onClick={() => setShowArchitectureHealth(!showArchitectureHealth)}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Developer & Architecture Health Console</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-300 font-mono">
              Modular Monolith
            </span>
          </div>
          {showArchitectureHealth ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showArchitectureHealth && (
          <div className="mt-4 p-6 rounded-3xl border border-slate-800 bg-slate-950/80 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Backend Core</span>
                  <Server className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    {isLoadingHealth ? (
                      <span className="text-slate-500 font-mono">Checking...</span>
                    ) : isHealthError ? (
                      <span className="text-rose-400 font-bold">Offline</span>
                    ) : (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {health?.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Uptime</span>
                    <span className="font-mono text-slate-300">
                      {health?.uptime !== undefined ? `${health.uptime}s` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Database Layer</span>
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Connection</span>
                    {health?.database?.isConnected ? (
                      <span className="text-emerald-400 font-bold">CONNECTED</span>
                    ) : (
                      <span className="text-amber-400 font-bold">DISCONNECTED</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Engine</span>
                    <span className="font-mono text-slate-300">MongoDB / Mongoose</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Health Probe</span>
                  <Terminal className="w-4 h-4 text-cyan-400" />
                </div>
                <button
                  type="button"
                  onClick={() => refetchHealth()}
                  disabled={isFetchingHealth}
                  className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  {isFetchingHealth ? 'Probing...' : 'Re-verify Health'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;

