import React from 'react';
import { ShoppingBag, ShieldCheck, MapPin, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { CheckoutSession } from '../types/checkout.types';
import { CheckoutItem } from './CheckoutItem';
import { CheckoutCountdown } from './CheckoutCountdown';
import { formatMoney } from '../../../utils/money';

interface CheckoutSummaryProps {
  session: CheckoutSession;
  onCancelCheckout: () => void;
  isCancelling: boolean;
  onRevalidateCheckout: () => void;
  isRevalidating: boolean;
  onPlaceOrder: (customerNotes?: string) => void;
  isPlacingOrder: boolean;
  onExpired: () => void;
  errorMessage?: string | null;
}

export const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({
  session,
  onCancelCheckout,
  isCancelling,
  onRevalidateCheckout,
  isRevalidating,
  onPlaceOrder,
  isPlacingOrder,
  onExpired,
  errorMessage,
}) => {
  const [customerNotes, setCustomerNotes] = React.useState('');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Expiry Countdown & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-white">Active Checkout Session</span>
          </div>
          <p className="text-xs text-slate-400">
            Stock holds are temporary and will be released when the timer reaches zero.
          </p>
        </div>

        <CheckoutCountdown expiresAt={session.expiresAt} onExpired={onExpired} />
      </div>

      {/* Price Change Notice */}
      {session.hasPriceChanges && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-bold">Notice: Price update detected.</span>
            <p className="text-[11px] text-amber-300/80 mt-0.5">
              One or more product prices changed since your last view. Your subtotal and line items have been automatically revalidated with live catalog pricing.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Review Items & Address Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Snapshotted Items & Addresses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reserved Items Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <span>Reserved Items ({session.items.length})</span>
              </h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                Stock Reserved
              </span>
            </div>

            <div className="space-y-1">
              {session.items.map((item) => (
                <CheckoutItem key={item.variantId} item={item} currency={session.currency} />
              ))}
            </div>
          </div>

          {/* Fulfillment & Billing Addresses Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipping Address */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>Shipping Address</span>
              </div>
              <div className="space-y-0.5 text-xs text-slate-300">
                <p className="font-semibold text-white text-sm">{session.shippingAddress.fullName}</p>
                <p>{session.shippingAddress.addressLine1}</p>
                {session.shippingAddress.addressLine2 && <p>{session.shippingAddress.addressLine2}</p>}
                <p>
                  {session.shippingAddress.city}, {session.shippingAddress.stateProvince}
                </p>
                <p className="font-mono text-slate-400">{session.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>Billing Address</span>
              </div>
              <div className="space-y-0.5 text-xs text-slate-300">
                <p className="font-semibold text-white text-sm">{session.billingAddress.fullName}</p>
                <p>{session.billingAddress.addressLine1}</p>
                {session.billingAddress.addressLine2 && <p>{session.billingAddress.addressLine2}</p>}
                <p>
                  {session.billingAddress.city}, {session.billingAddress.stateProvince}
                </p>
                <p className="font-mono text-slate-400">{session.billingAddress.phone}</p>
              </div>
            </div>
          </div>

          {/* Optional Delivery Instructions */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Delivery Notes / Instructions (Optional)
            </label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Leave package with security guard, gate code #1234, ring bell..."
              className="w-full px-3.5 py-2.5 bg-slate-850 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Right: Checkout Subtotal & Action Bar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl sticky top-24 backdrop-blur-md">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
              Payment Summary
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-mono font-semibold text-white">
                  {formatMoney(session.subtotal, session.currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span>
                <span className="text-emerald-400 font-semibold">Free Delivery</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Tax</span>
                <span className="text-[11px] italic">Included</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Total Amount</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {formatMoney(session.subtotal, session.currency)}
                </span>
              </div>
            </div>

            {/* Place Order Primary Action */}
            <button
              type="button"
              onClick={() => onPlaceOrder(customerNotes.trim() || undefined)}
              disabled={isPlacingOrder || isCancelling || isRevalidating}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPlacingOrder ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Place Order</span>
                </>
              )}
            </button>

            {/* Revalidate & Cancel Session Actions */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onRevalidateCheckout}
                disabled={isRevalidating || isPlacingOrder}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRevalidating ? 'animate-spin' : ''}`} />
                <span>{isRevalidating ? 'Revalidating...' : 'Refresh / Revalidate'}</span>
              </button>

              <button
                type="button"
                onClick={onCancelCheckout}
                disabled={isCancelling || isPlacingOrder}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>{isCancelling ? 'Cancelling...' : 'Cancel Checkout & Release Stock'}</span>
              </button>
            </div>

            {/* Security Guarantee */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Real-time stock reservation active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

