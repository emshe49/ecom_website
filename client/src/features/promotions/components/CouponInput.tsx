import React, { useState } from 'react';
import { Tag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { CheckoutDiscountSnapshot } from '../../checkout/types/checkout.types';
import { formatMoney } from '../../../utils/money';

interface CouponInputProps {
  appliedCoupon?: CheckoutDiscountSnapshot | null;
  currency?: string;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => Promise<void>;
  disabled?: boolean;
}

export const CouponInput: React.FC<CouponInputProps> = ({
  appliedCoupon,
  currency = 'USD',
  onApplyCoupon,
  onRemoveCoupon,
  disabled = false,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setError(null);
    setLoading(true);
    try {
      await onApplyCoupon(trimmed);
      setCode('');
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to apply coupon code.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setLoading(true);
    try {
      await onRemoveCoupon();
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to remove coupon.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
        <Tag className="w-3.5 h-3.5 text-indigo-400" />
        <span>Promo & Coupon Code</span>
      </div>

      {appliedCoupon ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs text-emerald-300 uppercase tracking-wide">
                  {appliedCoupon.code || appliedCoupon.name}
                </span>
                <span className="text-[10px] text-emerald-400/80 bg-emerald-900/40 px-1.5 py-0.5 rounded font-medium">
                  Applied
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 font-mono">
                Saving {formatMoney(appliedCoupon.discountAmount, currency)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={loading || disabled}
            className="px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            <span>Remove</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="Enter coupon code"
              disabled={loading || disabled}
              className="flex-1 min-w-0 px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={loading || disabled || !code.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Applying...</span>
                </>
              ) : (
                <span>Apply</span>
              )}
            </button>
          </div>

          {error && (
            <p className="text-[11px] text-rose-400 flex items-center gap-1">
              <XCircle className="w-3 h-3 shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </form>
      )}
    </div>
  );
};
