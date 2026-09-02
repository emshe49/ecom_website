import React, { useState } from 'react';
import { useInventoryAnalytics, analyticsApi, downloadCsvBlob } from '../api/analytics.api';
import { AnalyticsFilterParams, InventoryTableRow } from '../types/analytics.types';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { ReportTable, ColumnDef } from '../components/ReportTable';

export const InventoryAnalyticsPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({
    page: 1,
    limit: 20,
    sortBy: 'currentOnHand',
    sortOrder: 'asc',
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, error } = useInventoryAnalytics(params);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await analyticsApi.exportInventoryCsv(params);
      downloadCsvBlob(blob, `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<InventoryTableRow>[] = [
    { key: 'sku', header: 'SKU', sortable: true, render: (r) => <span className="font-mono font-bold text-indigo-400">{r.sku}</span> },
    { key: 'productName', header: 'Product / Variant', render: (r) => <div><div className="font-semibold text-white">{r.productName}</div>{r.variantName && <div className="text-[10px] text-slate-400">{r.variantName}</div>}</div> },
    { key: 'stockIn', header: 'Stock In', sortable: true, align: 'right', render: (r) => <span className="text-emerald-400 font-mono">+{r.stockIn}</span> },
    { key: 'sold', header: 'Sold', sortable: true, align: 'right', render: (r) => <span className="text-rose-400 font-mono">-{r.sold}</span> },
    { key: 'adjustments', header: 'Adjustments', sortable: true, align: 'right', render: (r) => <span className="text-slate-300 font-mono">{r.adjustments > 0 ? `+${r.adjustments}` : r.adjustments}</span> },
    { key: 'currentOnHand', header: 'On Hand', sortable: true, align: 'right', render: (r) => <span className="font-mono font-bold text-white">{r.currentOnHand}</span> },
    { key: 'reserved', header: 'Reserved', sortable: true, align: 'right', render: (r) => <span className="font-mono text-amber-400">{r.reserved}</span> },
    { key: 'available', header: 'Available', sortable: true, align: 'right', render: (r) => <span className={`font-mono font-bold ${r.available <= r.lowStockThreshold ? 'text-rose-400' : 'text-emerald-400'}`}>{r.available}</span> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Inventory Health & Movement</h1>
        <p className="text-xs text-slate-400 mt-1">
          Authoritative SKU-level inventory audits grouped by transaction activity
        </p>
      </div>

      <ReportFilters
        onFilterChange={(newParams) => setParams((prev) => ({ ...prev, ...newParams, page: 1 }))}
        onExportCsv={handleExportCsv}
        isExporting={isExporting}
        showSearch={true}
        searchPlaceholder="Search by product name or SKU..."
      />

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
          Failed to load inventory analytics report.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="Stock-In Units"
              value={data?.movementSummary.stockInUnits || 0}
              format="number"
            />
            <ReportSummaryCard
              title="Units Sold"
              value={data?.movementSummary.saleUnits || 0}
              format="number"
            />
            <ReportSummaryCard
              title="Low Stock Alerts"
              value={data?.stockHealth.lowStockVariants || 0}
              format="number"
              subtitle="Below variant threshold"
            />
            <ReportSummaryCard
              title="Out of Stock Items"
              value={data?.stockHealth.outOfStockVariants || 0}
              format="number"
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-3">Inventory Ledger & Availability</h2>
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

export default InventoryAnalyticsPage;
