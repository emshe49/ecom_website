import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, RefreshCw, ShoppingCart } from 'lucide-react';

interface CheckoutExpiredStateProps {
  onRestart: () => void;
  isRestarting?: boolean;
}

export const CheckoutExpiredState: React.FC<CheckoutExpiredStateProps> = ({
  onRestart,
  isRestarting = false,
}) => {
  return (
    <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-6 shadow-2xl backdrop-blur-md animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-950/50">
        <Clock className="w-8 h-8 animate-pulse" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Checkout Session Expired</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your 15-minute inventory hold has elapsed. To ensure fair stock availability for all shoppers, your reserved items have been released back to general inventory.
        </p>
      </div>

      <div className="pt-2 flex flex-col gap-3">
        <button
          type="button"
          onClick={onRestart}
          disabled={isRestarting}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRestarting ? 'animate-spin' : ''}`} />
          <span>{isRestarting ? 'Revalidating Cart...' : 'Start Checkout Again'}</span>
        </button>

        <Link
          to="/cart"
          className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4 text-slate-400" />
          <span>Return to Shopping Cart</span>
        </Link>
      </div>
    </div>
  );
};
