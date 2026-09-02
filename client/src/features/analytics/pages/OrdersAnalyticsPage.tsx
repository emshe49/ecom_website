import React, { useState } from 'react';
import { useOrdersAnalytics, analyticsApi, downloadCsvBlob } from '../api/analytics.api';
import { AnalyticsFilterParams, OrderTableRow } from '../types/analytics.types';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { ReportTable, ColumnDef } from '../components/ReportTable';

export const OrdersAnalyticsPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({
    page: 1,
    limit: 20,
    sortBy: 'placedAt',
    sortOrder: 'desc',
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error } = useOrdersAnalytics(params);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await analyticsApi.exportOrdersCsv(params);
      downloadCsvBlob(blob, `orders_report_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<OrderTableRow>[] = [
    { key: 'orderNumber', header: 'Order #', sortable: true, render: (r) => <span className="font-mono font-bold text-indigo-400">{r.orderNumber}</span> },
    { key: 'customerName', header: 'Customer', render: (r) => <div><div className="font-semibold text-white">{r.customerName}</div><div className="text-[10px] text-slate-500">{r.customerEmail}</div></div> },
    { key: 'status', header: 'Status', sortable: true, render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">{r.status}</span> },
    { key: 'paymentStatus', header: 'Payment', sortable: true, render: (r) => <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>{r.paymentStatus}</span> },
    { key: 'itemCount', header: 'Items', align: 'center', accessor: (r) => r.itemCount },
    { key: 'total', header: 'Total', sortable: true, align: 'right', render: (r) => <span className="font-mono font-bold text-white">${(r.total / 100).toFixed(2)}</span> },
    { key: 'createdAt', header: 'Placed At', sortable: true, align: 'right', render: (r) => <span className="text-slate-400 text-[11px] font-mono">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Orders Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical order volume, cancellation rates, and fulfillment tracking
        </p>
      </div>

      <ReportFilters
        onFilterChange={(newParams) => setParams((prev) => ({ ...prev, ...newParams, page: 1 }))}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
          Failed to load orders analytics report.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="Total Placed Orders"
              comparison={data?.summary.totalOrders}
              format="number"
            />
            <ReportSummaryCard
              title="Paid Orders"
              comparison={data?.summary.paidOrders}
              format="number"
            />
            <ReportSummaryCard
              title="Cancelled Orders"
              comparison={data?.summary.cancelledOrders}
              format="number"
            />
            <ReportSummaryCard
              title="Delivered Orders"
              comparison={data?.summary.deliveredOrders}
              format="number"
            />
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Status */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Orders by Status
              </h3>
              <div className="space-y-2">
                {data?.breakdown.byStatus.map((st) => (
                  <div key={st.status} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{st.status}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono">{st.count} orders</span>
                      <span className="font-bold text-white font-mono">{st.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Payment Status */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Orders by Payment Status
              </h3>
              <div className="space-y-2">
                {data?.breakdown.byPaymentStatus.map((st) => (
                  <div key={st.status} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{st.status}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono">{st.count} orders</span>
                      <span className="font-bold text-white font-mono">{st.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div>
            <h2 className="text-base font-bold text-white mb-3">Order History Ledger</h2>
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

export default OrdersAnalyticsPage;
