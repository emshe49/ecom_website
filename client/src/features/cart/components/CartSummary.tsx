import React from 'react';
import { ShieldCheck, ArrowRight, ShoppingBag } from 'lucide-react';
import { Cart } from '../types/cart.types';
import { formatMoney } from '../../../utils/money';

interface CartSummaryProps {
  cart: Cart;
  onClearCart?: () => void;
  isClearing?: boolean;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  cart,
  onClearCart,
  isClearing = false,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl sticky top-24 backdrop-blur-md">

      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-indigo-400" />
          <span>Order Summary</span>
        </h2>
        {onClearCart && cart.items.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            disabled={isClearing}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isClearing ? 'Clearing...' : 'Clear Cart'}
          </button>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>Distinct items</span>
          <span className="font-mono text-slate-100">{cart.itemCount}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Total quantity</span>
          <span className="font-mono text-slate-100">{cart.totalQuantity}</span>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
          <span className="text-base font-semibold text-white">Subtotal</span>
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {formatMoney(cart.subtotal, cart.currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <span>ℹ️</span>
          <span>Calculated at checkout</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Applicable taxes, shipping rates, and delivery options will be applied during order checkout.
        </p>
      </div>

      {/* Checkout Action Button */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={true}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-slate-800 text-slate-400 text-sm font-semibold border border-slate-700/60 cursor-not-allowed opacity-80"
          title="Checkout is coming in future modules"
        >
          <span>Proceed to Checkout</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-center text-[11px] text-indigo-400/80 font-medium">
          Checkout & payment flow will be unlocked in subsequent modules
        </p>
      </div>

      {/* Security badge */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Authoritative backend pricing verified</span>
      </div>
    </div>
  );
};

export default CartSummary;
