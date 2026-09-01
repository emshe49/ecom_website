import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Truck,
  Search,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { shippingApi } from '../api/shipping.api';
import { SHIPMENT_STATUS, ShipmentStatus } from '../types/shipping.types';
import { ShipmentStatusBadge } from '../components/ShipmentStatusBadge';

export const AdminShipmentsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | ''>('');
  const [carrierFilter, setCarrierFilter] = useState<string>('');

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-shipments', page, search, statusFilter, carrierFilter],
    queryFn: () =>
      shippingApi.listShipments({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter ? (statusFilter as ShipmentStatus) : undefined,
        carrier: carrierFilter.trim() || undefined,
      }),
  });

  const shipments = data?.shipments || [];
  const pagination = data?.pagination || { page: 1, total: 0, totalPages: 1 };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Shipments & Fulfillment
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Track customer deliveries, update fulfillment milestones, and manage carrier tracking.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="p-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search shipment/order # or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ShipmentStatus | '');
              setPage(1);
            }}
            className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
          >
            <option value="">All Shipment Statuses</option>
            {Object.values(SHIPMENT_STATUS).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="text"
            placeholder="Filter by Carrier..."
            value={carrierFilter}
            onChange={(e) => {
              setCarrierFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
          />
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
            <p className="text-sm font-medium">Loading shipments...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
            <h3 className="font-bold text-zinc-700 dark:text-zinc-300">No Shipments Found</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Shipments will appear here once orders are placed and ready for fulfillment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3.5 px-6">Shipment / Order</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Destination</th>
                  <th className="py-3.5 px-6">Carrier / Tracking</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Created</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {shipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <Link
                        to={`/admin/shipments/${shipment.id}`}
                        className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {shipment.shipmentNumber}
                      </Link>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Order #{shipment.orderNumber}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-zinc-900 dark:text-white">
                        {shipment.customer.fullName}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {shipment.customer.email}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-zinc-700 dark:text-zinc-300 font-medium">
                      {shipment.destinationCity}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {shipment.carrierName || shipment.carrier}
                      </div>
                      {shipment.trackingNumber ? (
                        <span className="font-mono text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          {shipment.trackingNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">No tracking #</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <ShipmentStatusBadge status={shipment.status} />
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-500">
                      {new Date(shipment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/admin/shipments/${shipment.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
