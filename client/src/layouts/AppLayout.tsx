import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Layers, ShieldCheck, Cpu, LogOut, LogIn, UserPlus, ShoppingCart, Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../features/auth/store/auth.store';
import { authApi } from '../features/auth/api/auth.api';
import { cartApi } from '../features/cart/api/cart.api';
import { useWishlist } from '../features/wishlist/hooks/useWishlist';
import { NotificationBell } from '../features/notifications/components/NotificationBell';

export const AppLayout: React.FC = () => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const isStaff = isAuthenticated && user?.role && user.role !== 'CUSTOMER';
  const isCustomer = isAuthenticated && user?.role === 'CUSTOMER';
  const isGuest = !isAuthenticated;

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
    enabled: isCustomer,
    staleTime: 1000 * 60, // 1 minute
  });

  const { itemCount: wishlistItemCount } = useWishlist();

  const cartTotalQuantity = isCustomer && cart ? cart.totalQuantity : 0;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network failure on logout
    } finally {
      clearAuth();
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to={isStaff ? "/admin" : "/"}
            className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <span>
              E-Commerce{' '}
              <span className="text-xs font-mono font-normal uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60 ml-1">
                {isStaff ? 'Admin Workspace' : 'Monolith'}
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              to="/products"
              className="text-xs font-semibold text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
            >
              <span>Explore Shop</span>
            </Link>

            {/* Shopper/Customer Links only: Wishlist & Cart */}
            {(isCustomer || isGuest) && (
              <>
                <Link
                  to={isAuthenticated ? '/wishlist' : '/login'}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-800"
                  title="Saved Wishlist"
                >
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Wishlist</span>
                  {wishlistItemCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold shadow-sm shadow-rose-600/50 animate-fadeIn">
                      {wishlistItemCount}
                    </span>
                  )}
                </Link>

                <Link
                  to={isAuthenticated ? '/cart' : '/login'}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-800"
                  title="Shopping Cart"
                >
                  <ShoppingCart className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Cart</span>
                  {cartTotalQuantity > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-bold shadow-sm shadow-indigo-600/50 animate-fadeIn">
                      {cartTotalQuantity}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* My Orders & My Reviews Links (Customer only) */}
            {isCustomer && (
              <>
                <Link
                  to="/orders"
                  className="text-xs font-semibold text-slate-300 hover:text-indigo-400 transition-colors hidden sm:flex items-center gap-1"
                >
                  <span>My Orders</span>
                </Link>
                <Link
                  to="/account/reviews"
                  className="text-xs font-semibold text-slate-300 hover:text-amber-400 transition-colors hidden sm:flex items-center gap-1"
                >
                  <span>My Reviews</span>
                </Link>
                <Link
                  to="/support"
                  className="text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors hidden sm:flex items-center gap-1"
                >
                  <span>Support</span>
                </Link>
              </>
            )}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                {isStaff && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all border border-indigo-500"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs transition-colors border border-slate-700/60"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                    {user.firstName[0]}
                  </div>
                  <span>{user.firstName}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-indigo-400">
                    {user.role}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-xs transition-colors border border-slate-800 hover:border-rose-800/60 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (

              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors border border-slate-800"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Modular Monolith Architecture Foundation</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Module 02: Authentication & Sessions Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
