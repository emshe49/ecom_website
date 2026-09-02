import React, { useState } from 'react';
import { useProductsAnalytics, analyticsApi, downloadCsvBlob } from '../api/analytics.api';
import { AnalyticsFilterParams, ProductTableRow } from '../types/analytics.types';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { ReportTable, ColumnDef } from '../components/ReportTable';

export const ProductsAnalyticsPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({
    page: 1,
    limit: 20,
    sortBy: 'grossRevenue',
    sortOrder: 'desc',
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error } = useProductsAnalytics(params);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await analyticsApi.exportProductsCsv(params);
      downloadCsvBlob(blob, `products_report_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<ProductTableRow>[] = [
    { key: 'productName', header: 'Product Name', sortable: true, render: (r) => <div className="font-semibold text-white">{r.productName}</div> },
    { key: 'unitsSold', header: 'Units Sold', sortable: true, align: 'right', accessor: (r) => r.unitsSold.toLocaleString() },
    { key: 'ordersCount', header: 'Orders', sortable: true, align: 'right', accessor: (r) => r.ordersCount.toLocaleString() },
    { key: 'grossRevenue', header: 'Gross Revenue', sortable: true, align: 'right', render: (r) => <span className="font-mono text-indigo-300 font-semibold">${(r.grossRevenue / 100).toFixed(2)}</span> },
    { key: 'refundAmount', header: 'Refunds', sortable: true, align: 'right', render: (r) => <span className="font-mono text-rose-400">${(r.refundAmount / 100).toFixed(2)}</span> },
    { key: 'netRevenue', header: 'Net Revenue', sortable: true, align: 'right', render: (r) => <span className="font-mono text-emerald-400 font-bold">${(r.netRevenue / 100).toFixed(2)}</span> },
    { key: 'averageRating', header: 'Rating', sortable: true, align: 'center', render: (r) => <span className="text-amber-400 font-mono font-semibold">★ {r.averageRating > 0 ? r.averageRating.toFixed(1) : '—'}</span> },
    { key: 'returnRate', header: 'Return Rate', sortable: true, align: 'right', render: (r) => <span className="font-mono text-slate-300">{r.returnRate}%</span> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Product Performance Reports</h1>
        <p className="text-xs text-slate-400 mt-1">
          Revenue by product line computed from immutable order item snapshots
        </p>
      </div>

      <ReportFilters
        onFilterChange={(newParams) => setParams((prev) => ({ ...prev, ...newParams, page: 1 }))}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        showSearch={true}
        searchPlaceholder="Search product by title..."
      />

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
          Failed to load product performance report.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="Products with Sales"
              value={data?.summary.totalProductsSold || 0}
              format="number"
            />
            <ReportSummaryCard
              title="Total Units Sold"
              value={data?.summary.totalUnitsSold || 0}
              format="number"
            />
            <ReportSummaryCard
              title="Gross Product Revenue"
              value={data?.summary.grossProductRevenue || 0}
              format="currency"
            />
            <ReportSummaryCard
              title="Net Product Revenue"
              value={data?.summary.netProductRevenue || 0}
              format="currency"
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-3">Product Sales Matrix</h2>
            <ReportTable
              columns={columns}
              data={data?.items || []}
              pagination={data?.pagination}
              onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
              sortBy={params.sortBy}
              sortOrder={params.sortOrder}
              onSortChange={(colKey) =>
                setParams((prev) => ({
                  ...prev,
                  sortBy: colKey,
                  sortOrder: prev.sortBy === colKey && prev.sortOrder === 'asc' ? 'desc' : 'asc',
                }))
              }
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ProductsAnalyticsPage;
