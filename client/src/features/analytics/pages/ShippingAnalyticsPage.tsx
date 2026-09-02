import React, { useState } from 'react';
import { useShippingAnalytics } from '../api/analytics.api';
import { AnalyticsFilterParams, ShippingCarrierBreakdownPoint } from '../types/analytics.types';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { ReportTable, ColumnDef } from '../components/ReportTable';

export const ShippingAnalyticsPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data, isLoading, error } = useShippingAnalytics(params);

  const carrierColumns: ColumnDef<ShippingCarrierBreakdownPoint>[] = [
    { key: 'carrier', header: 'Carrier Partner', render: (r) => <span className="font-semibold text-white">{r.carrier}</span> },
    { key: 'shipments', header: 'Total Shipments', align: 'right', accessor: (r) => r.shipments.toLocaleString() },
    { key: 'delivered', header: 'Delivered', align: 'right', render: (r) => <span className="text-emerald-400 font-mono font-semibold">{r.delivered}</span> },
    { key: 'failed', header: 'Failed', align: 'right', render: (r) => <span className="text-rose-400 font-mono font-semibold">{r.failed}</span> },
    { key: 'averageDeliveryHours', header: 'Avg Transit Duration', align: 'right', render: (r) => <span className="font-mono text-slate-300">{r.averageDeliveryHours} hrs</span> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Shipping & Fulfillment Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">
          Carrier transit performance, delivery SLA adherence, and shipping revenue contribution
        </p>
      </div>

      <ReportFilters
        onFilterChange={(newParams) => setParams((prev) => ({ ...prev, ...newParams, page: 1 }))}
      />

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
          Failed to load shipping analytics report.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="Total Shipments"
              comparison={data?.summary.totalShipments}
              format="number"
            />
            <ReportSummaryCard
              title="Delivered Successfully"
              comparison={data?.summary.deliveredShipments}
              format="number"
            />
            <ReportSummaryCard
              title="Average Delivery Time"
              value={data?.summary.averageDeliveryHours || 0}
              format="hours"
            />
            <ReportSummaryCard
              title="Shipping Fee Revenue"
              comparison={data?.summary.shippingRevenue}
              format="currency"
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-white mb-3">Carrier Performance Breakdown</h2>
            <ReportTable
              columns={carrierColumns}
              data={data?.carrierBreakdown || []}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ShippingAnalyticsPage;
