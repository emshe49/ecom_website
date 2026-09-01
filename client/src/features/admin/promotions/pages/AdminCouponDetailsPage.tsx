import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  Tag,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  History,
} from 'lucide-react';
import { promotionsApi } from '../../../promotions/api/promotions.api';
import { CouponRedemptionDTO } from '../../../promotions/types/promotions.types';
import { formatMoney } from '../../../../utils/money';

export const AdminCouponDetailsPage: React.FC = () => {
  const { couponId } = useParams<{ couponId: string }>();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const {
    data: coupon,
    isLoading: isLoadingCoupon,
    error: couponError,
  } = useQuery({
    queryKey: ['admin-coupon', couponId],
    queryFn: () => promotionsApi.getAdminCouponById(couponId!),
    enabled: !!couponId,
  });

  const { data: redemptionsData, isLoading: isLoadingRedemptions } = useQuery({
    queryKey: ['admin-coupon-redemptions', couponId, page],
    queryFn: () => promotionsApi.getAdminCouponRedemptions(couponId!, { page, limit: 10 }),
    enabled: !!couponId,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (active: boolean) =>
      promotionsApi.updateAdminCoupon(couponId!, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupon', couponId] });
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  if (isLoadingCoupon) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-xs">Loading coupon details...</span>
      </div>
    );
  }

  if (couponError || !coupon) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/coupons"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Coupons</span>
        </Link>
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>Coupon not found or error loading audit history.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/coupons"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Coupons
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-indigo-300 font-mono font-bold uppercase">
              {coupon.code}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-indigo-400" />
            <span>{coupon.code}</span>
          </h1>
          <p className="text-xs text-slate-400">{coupon.name}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleActiveMutation.mutate(!coupon.active)}
            disabled={toggleActiveMutation.isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              coupon.active
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {coupon.active ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Status</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                <span>Disabled</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Discount Rules */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
            <span>Discount Mechanics</span>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Discount Type:</span>
              <span className="font-semibold text-white">{coupon.discountType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Discount Value:</span>
              <span className="font-mono font-bold text-emerald-400">
                {coupon.discountType === 'PERCENTAGE'
                  ? `${coupon.discountValue}%`
                  : formatMoney(coupon.discountValue, 'USD')}
              </span>
            </div>
            {coupon.maxDiscountAmount && (
              <div className="flex justify-between">
                <span className="text-slate-400">Max Discount Cap:</span>
                <span className="font-mono text-white">
                  {formatMoney(coupon.maxDiscountAmount, 'USD')}
                </span>
              </div>
            )}
            {coupon.minimumOrderAmount && (
              <div className="flex justify-between">
                <span className="text-slate-400">Minimum Spend:</span>
                <span className="font-mono text-white">
                  {formatMoney(coupon.minimumOrderAmount, 'USD')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Limits & Redemptions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
            <span>Usage & Limits</span>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Redemptions:</span>
              <span className="font-mono font-bold text-white text-sm">
                {coupon.redemptionCount} / {coupon.usageLimit || '∞'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Per-User Limit:</span>
              <span className="font-semibold text-white">
                {coupon.perUserLimit ? `${coupon.perUserLimit} order(s)` : 'Unlimited'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Customer Eligibility:</span>
              <span className="text-white">
                {coupon.firstOrderOnly ? (
                  <span className="text-amber-300 font-medium">New Customers Only</span>
                ) : (
                  'All Customers'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Validity Period */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
            <span>Validity Window</span>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Starts At:</span>
              <span className="text-white">
                {coupon.startsAt ? new Date(coupon.startsAt).toLocaleString() : 'Immediate'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ends At:</span>
              <span className="text-white">
                {coupon.endsAt ? new Date(coupon.endsAt).toLocaleString() : 'No Expiry'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Created:</span>
              <span className="text-white">{new Date(coupon.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Redemption Audit Trail Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <span>Redemption Audit Trail ({coupon.redemptionCount})</span>
          </h2>
          <span className="text-xs text-slate-500">
            Immutable log of orders that redeemed or reversed this discount code
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer ID</th>
                  <th className="py-3 px-4">Discount Applied</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Reversal Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoadingRedemptions ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                      <span>Loading audit records...</span>
                    </td>
                  </tr>
                ) : !redemptionsData?.data || redemptionsData.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No redemptions recorded for this coupon yet.
                    </td>
                  </tr>
                ) : (
                  redemptionsData.data.map((r: CouponRedemptionDTO) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-300">
                        <Link to={`/admin/orders/${r.orderId}`} className="hover:underline">
                          {r.orderId}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{r.userId}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                        {formatMoney(r.discountAmount, 'USD')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'REDEEMED'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(r.redeemedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400 italic">
                        {r.reversalReason || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {redemptionsData && redemptionsData.pagination && redemptionsData.pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400">
              <span>
                Showing Page {redemptionsData.pagination.page} of{' '}
                {redemptionsData.pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!redemptionsData.pagination.hasPrevPage}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!redemptionsData.pagination.hasNextPage}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
