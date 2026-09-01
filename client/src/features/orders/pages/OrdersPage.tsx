import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../api/orders.api';
import { OrderListItemDTO, PaginationMeta } from '../orders.types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import {
  ShoppingBag,
  ChevronRight,
  Filter,
  Receipt,
  RotateCw,
} from 'lucide-react';


export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderListItemDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ordersApi.getMyOrders({
        page,
        limit: 10,
        status: selectedStatus || undefined,
      });
      setOrders(res.orders);
      setPagination(res.pagination);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Failed to load your orders.');
    } finally {
      setIsLoading(false);
    }

  };

  useEffect(() => {
    fetchOrders();
  }, [page, selectedStatus]);

  const formatPrice = (minorUnits: number, currency = 'PKR') => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(minorUnits / 100);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Receipt className="w-8 h-8 text-indigo-400" />
            My Orders
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            View order history, track live delivery status, and review item details.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 py-2 bg-slate-850 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">All Statuses</option>
              <option value="PLACED">Placed</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="READY_TO_SHIP">Ready to Ship</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <button
            onClick={() => fetchOrders()}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-xl transition-colors cursor-pointer"
            title="Refresh orders"
          >
            <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 animate-pulse"
            >
              <div className="h-6 bg-slate-800 rounded w-1/4 mb-4" />
              <div className="h-4 bg-slate-800 rounded w-1/2 mb-2" />
              <div className="h-4 bg-slate-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-6 bg-rose-950/30 border border-rose-800/40 rounded-2xl text-rose-300 text-center">
          <p className="font-semibold mb-2">{error}</p>
          <button
            onClick={() => fetchOrders()}
            className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && orders.length === 0 && (
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-200 mb-1">
            {selectedStatus ? 'No orders matching this status' : 'No orders yet'}
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            {selectedStatus
              ? 'Try selecting a different filter or clearing your selection to view all orders.'
              : "When you place an order, you'll be able to view and track your purchase progress right here."}
          </p>
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
          >
            Start Shopping
          </Link>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-base font-bold text-white tracking-wide">
                    {order.orderNumber}
                  </span>
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
                <div className="text-xs text-slate-400">
                  Placed on {new Date(order.placedAt || order.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {order.firstItemImage ? (
                      <img
                        src={order.firstItemImage}
                        alt={order.firstItemName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-7 h-7 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100 line-clamp-1">
                      {order.firstItemName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} total
                    </p>
                    <p className="text-sm font-bold text-indigo-400 mt-1">
                      {formatPrice(order.total, order.currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 sm:pt-0">
                  <Link
                    to={`/orders/${order.id}`}
                    className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-colors space-x-1"
                  >
                    <span>View Order Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}


          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 text-xs text-slate-400">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
