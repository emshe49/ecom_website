import React, { useState } from 'react';
import { useCustomersAnalytics, analyticsApi, downloadCsvBlob } from '../api/analytics.api';
import { AnalyticsFilterParams, CustomerTableRow } from '../types/analytics.types';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { ReportTable, ColumnDef } from '../components/ReportTable';

export const CustomersAnalyticsPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({
    page: 1,
    limit: 20,
    sortBy: 'totalSpend',
    sortOrder: 'desc',
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error } = useCustomersAnalytics(params);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await analyticsApi.exportCustomersCsv(params);
      downloadCsvBlob(blob, `customers_report_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<CustomerTableRow>[] = [
    { key: 'displayName', header: 'Customer', render: (r) => <div><div className="font-semibold text-white">{r.displayName}</div>{r.email && <div className="text-[10px] text-slate-500">{r.email}</div>}</div> },
    { key: 'joinedAt', header: 'Joined', sortable: true, render: (r) => <span className="font-mono text-slate-400 text-[11px]">{new Date(r.joinedAt).toLocaleDateString()}</span> },
    { key: 'ordersCount', header: 'Completed Orders', sortable: true, align: 'right', accessor: (r) => r.ordersCount.toLocaleString() },
    { key: 'totalSpend', header: 'Total Lifetime Spend', sortable: true, align: 'right', render: (r) => <span className="font-mono text-emerald-400 font-bold">${(r.totalSpend / 100).toFixed(2)}</span> },
    { key: 'averageOrderValue', header: 'AOV', sortable: true, align: 'right', render: (r) => <span className="font-mono text-slate-300">${(r.averageOrderValue / 100).toFixed(2)}</span> },
    { key: 'lastOrderAt', header: 'Last Order', render: (r) => <span className="font-mono text-slate-400 text-[11px]">{r.lastOrderAt ? new Date(r.lastOrderAt).toLocaleDateString() : 'Never'}</span> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Customer Analytics & Retention</h1>
        <p className="text-xs text-slate-400 mt-1">
          Customer acquisition, repeat purchasing patterns, and lifetime spend cohorts
        </p>
      </div>

      <ReportFilters
        onFilterChange={(newParams) => setParams((prev) => ({ ...prev, ...newParams, page: 1 }))}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        showSearch={true}
        searchPlaceholder="Search customer by name or email..."
      />

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
          Failed to load customer analytics report.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="New Registrations"
              comparison={data?.summary.newCustomers}
              format="number"
            />
            <ReportSummaryCard
              title="Active Buyers"
              comparison={data?.summary.customersWithOrders}
              format="number"
            />
            <ReportSummaryCard
              title="Repeat Customers"
              comparison={data?.summary.repeatCustomers}
              format="number"
            />
            <ReportSummaryCard
              title="Repeat Customer Rate"
              value={data?.summary.repeatCustomerRate || 0}
              format="percentage"
              subtitle="Cohort >= 2 paid orders"
            />
          </div>

          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-xs text-slate-400">
            💡 <span className="font-semibold text-slate-300">Cohort Definition:</span> {data?.repeatDefinition || 'Repeat customers are defined as accounts with 2 or more non-cancelled paid orders.'}
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-3">Customer Spend Ledger</h2>
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

export default CustomersAnalyticsPage;
