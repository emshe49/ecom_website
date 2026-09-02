import React, { useState } from 'react';
import { useReturnsAnalytics, useRefundsAnalytics, analyticsApi, downloadCsvBlob } from '../api/analytics.api';
import { AnalyticsFilterParams } from '../types/analytics.types';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { ReportTable, ColumnDef } from '../components/ReportTable';

export const ReturnsRefundsAnalyticsPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data: returnsData, isLoading: returnsLoading } = useReturnsAnalytics(params);
  const { data: refundsData, isLoading: refundsLoading } = useRefundsAnalytics(params);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await analyticsApi.exportRefundsCsv(params);
      downloadCsvBlob(blob, `refunds_report_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  const refundColumns: ColumnDef<any>[] = [
    { key: 'refundNumber', header: 'Refund #', render: (r) => <span className="font-mono font-bold text-indigo-400">{r.refundNumber}</span> },
    { key: 'orderNumber', header: 'Order #', render: (r) => <span className="font-mono text-slate-300">{r.orderNumber}</span> },
    { key: 'amount', header: 'Refund Amount', align: 'right', render: (r) => <span className="font-mono font-bold text-rose-400">${(r.amount / 100).toFixed(2)}</span> },
    { key: 'status', header: 'Status', render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">{r.status}</span> },
    { key: 'method', header: 'Method', render: (r) => <span className="text-slate-400">{r.method}</span> },
    { key: 'createdAt', header: 'Processed At', align: 'right', render: (r) => <span className="font-mono text-slate-400 text-[11px]">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Returns & Refunds Management</h1>
        <p className="text-xs text-slate-400 mt-1">
          Return reason classifications, unit return rates, and financial refund execution
        </p>
      </div>

      <ReportFilters
        onFilterChange={(newParams) => setParams((prev) => ({ ...prev, ...newParams, page: 1 }))}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportSummaryCard
          title="Return Requests"
          comparison={returnsData?.summary.requests}
          format="number"
        />
        <ReportSummaryCard
          title="Completed Returns"
          comparison={returnsData?.summary.completed}
          format="number"
        />
        <ReportSummaryCard
          title="Unit Return Rate"
          value={returnsData?.summary.unitReturnRate || 0}
          format="percentage"
        />
        <ReportSummaryCard
          title="Total Refunds Issued"
          comparison={refundsData?.summary.refundAmount}
          format="currency"
        />
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reasons */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Return Reasons Breakdown
          </h3>
          <div className="space-y-2">
            {returnsData?.reasonsBreakdown.map((rb) => (
              <div key={rb.reasonCategory} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">{rb.reasonCategory}</span>
                <span className="font-bold text-white font-mono">{rb.count} requests</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Refunds by Method
          </h3>
          <div className="space-y-2">
            {refundsData?.methodBreakdown.map((mb) => (
              <div key={mb.method} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">{mb.method}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono">${(mb.amount / 100).toFixed(2)}</span>
                  <span className="font-bold text-white font-mono">{mb.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Refunds Ledger */}
      <div>
        <h2 className="text-base font-bold text-white mb-3">Financial Refunds Ledger</h2>
        <ReportTable
          columns={refundColumns}
          data={refundsData?.items || []}
          pagination={refundsData?.pagination}
          onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
          isLoading={refundsLoading || returnsLoading}
        />
      </div>
    </div>
  );
};

export default ReturnsRefundsAnalyticsPage;
