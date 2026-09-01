import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Search,
  RotateCw,
  ChevronRight,
  Filter,
  AlertTriangle,
  Banknote,
} from 'lucide-react';

import { paymentsApi } from '../api/payments.api';
import {
  AdminPaymentListItemDTO,
  PaymentStatus,
  PaymentMethod,
  PaymentQueryFilters,
} from '../payments.types';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<AdminPaymentListItemDTO[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('');
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Modal for COD confirmation
  const [codTarget, setCodTarget] = useState<AdminPaymentListItemDTO | null>(null);
  const [codNote, setCodNote] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const query: PaymentQueryFilters = {
        page,
        limit: 15,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
        search: search.trim() || undefined,
      };

      const res = await paymentsApi.listAdminPayments(query);
      setPayments(res.payments);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load payments.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, methodFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleConfirmCod = async () => {
    if (!codTarget) return;
    try {
      setActionLoading(true);
      await paymentsApi.confirmCodPayment(codTarget.id, { note: codNote });
      setCodTarget(null);
      setCodNote('');
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to confirm COD');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-indigo-400" />
            Payment Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor settlement records, review attempt histories, and confirm cash on delivery.
          </p>
        </div>

        <button
          onClick={() => fetchPayments()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700 w-fit"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Payment #, Order #, or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as PaymentStatus | '');
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SUCCEEDED">Paid / Succeeded</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value as PaymentMethod | '');
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Methods</option>
              <option value="ONLINE">Online</option>
              <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 flex items-center gap-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payments Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="px-6 py-4">Payment #</th>
                <th className="px-6 py-4">Order #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Method & Provider</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No payment records found matching your filters.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isCodPending =
                    p.method === 'CASH_ON_DELIVERY' && p.status === 'PENDING';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-slate-200">
                        <Link
                          to={`/admin/payments/${p.id}`}
                          className="text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          {p.paymentNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        <Link
                          to={`/admin/orders/${p.orderId}`}
                          className="hover:text-slate-200 hover:underline"
                        >
                          {p.orderNumber || p.orderId}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {p.customer ? (
                          <div>
                            <div className="font-medium text-slate-200">
                              {p.customer.firstName} {p.customer.lastName}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {p.customer.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">
                            {p.userId}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          {p.method === 'CASH_ON_DELIVERY' ? (
                            <Banknote className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-indigo-400" />
                          )}
                          <span>{p.method}</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {p.provider} • {p.attemptsCount} attempt{p.attemptsCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-100 font-mono">
                        {p.currency} {(p.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <PaymentStatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isCodPending && (
                          <button
                            onClick={() => setCodTarget(p)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-medium transition-colors"
                          >
                            Confirm COD
                          </button>
                        )}
                        <Link
                          to={`/admin/payments/${p.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-sm text-slate-400">
            <div>
              Showing page <span className="text-slate-200 font-medium">{page}</span> of{' '}
              <span className="text-slate-200 font-medium">{pagination.totalPages}</span> ({pagination.total} total payments)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs text-slate-200"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COD Confirmation Modal */}
      {codTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              Confirm Cash Collection
            </h3>
            <p className="text-xs text-slate-400">
              Confirm that cash amount of{' '}
              <span className="font-bold text-slate-200">
                {codTarget.currency} {(codTarget.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>{' '}
              for Order <span className="font-mono text-slate-200">{codTarget.orderNumber}</span> has been received from the courier.
            </p>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Collection Note (Optional)
              </label>
              <textarea
                value={codNote}
                onChange={(e) => setCodNote(e.target.value)}
                placeholder="e.g. Received from Courier Agent #145..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-20"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCodTarget(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCod}
                disabled={actionLoading}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              >
                {actionLoading ? 'Confirming...' : 'Mark Collected & Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
