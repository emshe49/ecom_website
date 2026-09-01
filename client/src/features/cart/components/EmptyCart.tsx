import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export const EmptyCart: React.FC = () => {
  return (
    <div className="py-20 text-center space-y-6 animate-fadeIn max-w-md mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/5">
        <ShoppingBag className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Your Shopping Cart is Empty
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Looks like you haven't added any products to your cart yet. Explore our catalog and discover exciting deals.
        </p>
      </div>

      <div className="pt-2">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default EmptyCart;
