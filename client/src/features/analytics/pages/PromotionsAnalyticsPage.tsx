import React, { useState } from 'react';
import { usePromotionsAnalytics } from '../api/analytics.api';
import { AnalyticsFilterParams, CouponPerformanceTableRow } from '../types/analytics.types';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { ReportTable, ColumnDef } from '../components/ReportTable';

export const PromotionsAnalyticsPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({
    page: 1,
    limit: 20,
    sortBy: 'discountGranted',
    sortOrder: 'desc',
  });

  const { data, isLoading, error } = usePromotionsAnalytics(params);

  const couponColumns: ColumnDef<CouponPerformanceTableRow>[] = [
    { key: 'couponCode', header: 'Coupon Code', render: (r) => <span className="font-mono font-bold text-indigo-400">{r.couponCode}</span> },
    { key: 'name', header: 'Campaign Name', accessor: (r) => r.name },
    { key: 'redemptions', header: 'Redemptions', align: 'right', accessor: (r) => r.redemptions.toLocaleString() },
    { key: 'discountGranted', header: 'Discount Granted', align: 'right', render: (r) => <span className="font-mono text-rose-400 font-semibold">${(r.discountGranted / 100).toFixed(2)}</span> },
    { key: 'ordersRevenue', header: 'Orders Revenue', align: 'right', render: (r) => <span className="font-mono text-emerald-400 font-bold">${(r.ordersRevenue / 100).toFixed(2)}</span> },
    { key: 'averageOrderValue', header: 'AOV', align: 'right', render: (r) => <span className="font-mono text-slate-300">${(r.averageOrderValue / 100).toFixed(2)}</span> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Promotions & Coupons Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">
          Marketing campaign ROI, coupon code redemptions, and automatic promotion performance
        </p>
      </div>

      <ReportFilters
        onFilterChange={(newParams) => setParams((prev) => ({ ...prev, ...newParams, page: 1 }))}
      />

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
          Failed to load promotions analytics report.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="Coupon Redemptions"
              comparison={data?.summary.couponRedemptions}
              format="number"
            />
            <ReportSummaryCard
              title="Orders with Coupons"
              comparison={data?.summary.couponOrders}
              format="number"
            />
            <ReportSummaryCard
              title="Discounts Granted"
              comparison={data?.summary.couponDiscountAmount}
              format="currency"
            />
            <ReportSummaryCard
              title="Avg Coupon Discount"
              value={data?.summary.averageCouponDiscount || 0}
              format="currency"
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-3">Top Performing Coupon Codes</h2>
            <ReportTable
              columns={couponColumns}
              data={data?.coupons || []}
              pagination={data?.pagination}
              onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default PromotionsAnalyticsPage;
