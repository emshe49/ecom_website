import React from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const WishlistEmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-6 max-w-lg mx-auto backdrop-blur-sm">
      <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10">
        <Heart className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">Your wishlist is empty</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Save products you are interested in by clicking the heart icon on any product card or detail page.
        </p>
      </div>

      <Link
        to="/products"
        className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
      >
        <span>Explore Products</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
};

export default WishlistEmptyState;
