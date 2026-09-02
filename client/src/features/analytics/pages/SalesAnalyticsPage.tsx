import React, { useState } from 'react';
import { useSalesAnalytics, analyticsApi, downloadCsvBlob } from '../api/analytics.api';
import { AnalyticsFilterParams, SalesTableRow } from '../types/analytics.types';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { ReportTrendChart } from '../components/ReportTrendChart';
import { ReportTable, ColumnDef } from '../components/ReportTable';

export const SalesAnalyticsPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({
    groupBy: 'day',
    page: 1,
    limit: 20,
    sortBy: 'period',
    sortOrder: 'desc',
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error } = useSalesAnalytics(params);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await analyticsApi.exportSalesCsv(params);
      downloadCsvBlob(blob, `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<SalesTableRow>[] = [
    { key: 'period', header: 'Period', sortable: true, accessor: (r) => <span className="font-mono font-bold text-white">{r.period}</span> },
    { key: 'ordersCount', header: 'Orders', sortable: true, align: 'right', accessor: (r) => r.ordersCount.toLocaleString() },
    { key: 'itemsSold', header: 'Items Sold', sortable: true, align: 'right', accessor: (r) => r.itemsSold.toLocaleString() },
    { key: 'grossRevenue', header: 'Gross Revenue', sortable: true, align: 'right', render: (r) => <span className="font-mono text-indigo-300 font-semibold">${(r.grossRevenue / 100).toFixed(2)}</span> },
    { key: 'discountAmount', header: 'Discounts', sortable: true, align: 'right', render: (r) => <span className="font-mono text-slate-400">${(r.discountAmount / 100).toFixed(2)}</span> },
    { key: 'refundAmount', header: 'Refunds', sortable: true, align: 'right', render: (r) => <span className="font-mono text-rose-400">${(r.refundAmount / 100).toFixed(2)}</span> },
    { key: 'netRevenue', header: 'Net Revenue', sortable: true, align: 'right', render: (r) => <span className="font-mono text-emerald-400 font-bold">${(r.netRevenue / 100).toFixed(2)}</span> },
    { key: 'averageOrderValue', header: 'AOV', sortable: true, align: 'right', render: (r) => <span className="font-mono text-slate-300">${(r.averageOrderValue / 100).toFixed(2)}</span> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales & Revenue Reports</h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical sales volume, promotional discounts, and net revenue streams
        </p>
      </div>

      {/* Filter Bar */}
      <ReportFilters
        onFilterChange={(newParams) => setParams((prev) => ({ ...prev, ...newParams, page: 1 }))}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
          Failed to load sales report data.
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="Gross Revenue"
              comparison={data?.summary.grossRevenue}
              format="currency"
            />
            <ReportSummaryCard
              title="Refunds"
              comparison={data?.summary.refundAmount}
              format="currency"
            />
            <ReportSummaryCard
              title="Net Revenue"
              comparison={data?.summary.netRevenue}
              format="currency"
            />
            <ReportSummaryCard
              title="Discounts Granted"
              comparison={data?.summary.discountAmount}
              format="currency"
            />
            <ReportSummaryCard
              title="Shipping Revenue"
              comparison={data?.summary.shippingRevenue}
              format="currency"
            />
            <ReportSummaryCard
              title="Paid Orders"
              comparison={data?.summary.orders}
              format="number"
            />
            <ReportSummaryCard
              title="Items Sold"
              comparison={data?.summary.itemsSold}
              format="number"
            />
            <ReportSummaryCard
              title="Average Order Value"
              comparison={data?.summary.averageOrderValue}
              format="currency"
            />
          </div>

          {/* Trend Chart */}
          {data?.trend && <ReportTrendChart data={data.trend} />}

          {/* Table */}
          <div>
            <h2 className="text-base font-bold text-white mb-3">Grouped Sales Ledger</h2>
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

export default SalesAnalyticsPage;
