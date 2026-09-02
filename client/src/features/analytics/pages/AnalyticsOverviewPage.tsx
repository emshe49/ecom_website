import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSalesAnalytics, analyticsApi, downloadCsvBlob } from '../api/analytics.api';
import { AnalyticsFilterParams } from '../types/analytics.types';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { ReportTrendChart } from '../components/ReportTrendChart';
import { ReportFilters } from '../components/ReportFilters';

export const AnalyticsOverviewPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({ groupBy: 'day' });
  const [isExporting, setIsExporting] = useState(false);

  const { data: salesData, isLoading, error } = useSalesAnalytics(params);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await analyticsApi.exportSalesCsv(params);
      downloadCsvBlob(blob, `sales_overview_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  const navLinks = [
    { title: 'Sales & Revenue', to: '/admin/analytics/sales', desc: 'Detailed sales trends, discounts, and revenue ledgers', icon: '💰' },
    { title: 'Orders Performance', to: '/admin/analytics/orders', desc: 'Order status breakdown, fulfillment times, and volume', icon: '📦' },
    { title: 'Product Analytics', to: '/admin/analytics/products', desc: 'Units sold, immutable price revenue, and return rates', icon: '🏷️' },
    { title: 'Customer Insights', to: '/admin/analytics/customers', desc: 'Repeat customer rates, spending analysis, and acquisition', icon: '👥' },
    { title: 'Inventory Health', to: '/admin/analytics/inventory', desc: 'Authoritative transaction movements and low-stock alerts', icon: '📊' },
    { title: 'Returns & Refunds', to: '/admin/analytics/returns', desc: 'Return reasons, return rates, and refund method tracking', icon: '🔄' },
    { title: 'Promotions & Coupons', to: '/admin/analytics/promotions', desc: 'Coupon redemptions, discount granting, and promotion impact', icon: '🎟️' },
    { title: 'Shipping & Delivery', to: '/admin/analytics/shipping', desc: 'Average transit durations, carrier performance, and fees', icon: '🚚' },
    { title: 'Reviews & Ratings', to: '/admin/analytics/reviews', desc: 'Sentiment distribution, verified purchaser ratings, and moderation', icon: '⭐' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            Module 21 Business Intelligence
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Analytics & Reports Executive Suite
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real historical business analytics aggregated directly from domain collections
          </p>
        </div>
      </div>

      {/* Shared Filter Bar */}
      <ReportFilters
        onFilterChange={setParams}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
          Failed to load analytics overview. Please adjust date filters or try again.
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800"></div>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="Gross Revenue"
              comparison={salesData?.summary.grossRevenue}
              format="currency"
            />
            <ReportSummaryCard
              title="Net Revenue"
              comparison={salesData?.summary.netRevenue}
              format="currency"
            />
            <ReportSummaryCard
              title="Orders Completed"
              comparison={salesData?.summary.orders}
              format="number"
            />
            <ReportSummaryCard
              title="Average Order Value"
              comparison={salesData?.summary.averageOrderValue}
              format="currency"
            />
          </div>

          {/* Trend Chart */}
          {salesData?.trend && <ReportTrendChart data={salesData.trend} />}

          {/* Report Navigation Grid */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Drill-Down Analytics Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="p-5 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/10 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{link.icon}</span>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {link.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{link.desc}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                    <span>View Report</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsOverviewPage;
