import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  RotateCw,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  User,
  Package,
  ExternalLink,
} from 'lucide-react';

import { paymentsApi } from '../api/payments.api';
import { AdminPaymentDetailDTO } from '../payments.types';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { PaymentAttemptHistory } from '../components/PaymentAttemptHistory';

export const AdminPaymentDetailsPage: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();

  const [payment, setPayment] = useState<AdminPaymentDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // COD Confirmation Modal
  const [showCodModal, setShowCodModal] = useState<boolean>(false);
  const [codNote, setCodNote] = useState<string>('');

  const fetchPayment = async () => {
    if (!paymentId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await paymentsApi.getAdminPaymentById(paymentId);
      setPayment(res);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load payment details.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  const handleConfirmCod = async () => {
    if (!paymentId) return;
    try {
      setActionLoading(true);
      const updated = await paymentsApi.confirmCodPayment(paymentId, {
        note: codNote,
      });
      setPayment(updated);
      setShowCodModal(false);
      setCodNote('');
      setSuccessMsg('Cash on Delivery payment confirmed successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to confirm COD');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconcile = async () => {
    if (!paymentId) return;
    try {
      setActionLoading(true);
      const updated = await paymentsApi.reconcilePayment(paymentId);
      setPayment(updated);
      setSuccessMsg('Payment status successfully reconciled with provider!');
    } catch (err: any) {
      alert(
        err.response?.data?.message || err.message || 'Failed to reconcile payment'
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <RotateCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading payment details...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-rose-500/20 bg-rose-950/20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-100 mb-2">Payment Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'Unable to find payment.'}</p>
        <Link
          to="/admin/payments"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payments
        </Link>
      </div>
    );
  }

  const isCodPending =
    payment.method === 'CASH_ON_DELIVERY' && payment.status === 'PENDING';
  const isOnlinePending =
    payment.method === 'ONLINE' &&
    (payment.status === 'PENDING' || payment.status === 'PROCESSING');

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div>
        <Link
          to="/admin/payments"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payments
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-100 font-mono">
                {payment.paymentNumber}
              </h1>
              <PaymentStatusBadge status={payment.status} size="lg" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Created on {new Date(payment.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isCodPending && (
              <button
                onClick={() => setShowCodModal(true)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/25 disabled:opacity-50"
              >
                <Banknote className="w-4 h-4" /> Confirm Cash Collection
              </button>
            )}

            {isOnlinePending && (
              <button
                onClick={handleReconcile}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/25 disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                Reconcile with Provider
              </button>
            )}
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Payment Settlement */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            Settlement Overview
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Total Amount</span>
              <span className="font-bold text-slate-100 font-mono text-sm">
                {payment.currency} {(payment.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Payment Method</span>
              <span className="font-medium text-slate-200">{payment.method}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Provider</span>
              <span className="font-medium text-slate-200">{payment.provider}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Paid Timestamp</span>
              <span className="font-mono text-slate-300">
                {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'Not Paid'}
              </span>
            </div>

            {payment.providerTransactionId && (
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Provider Txn ID</span>
                <span className="font-mono text-indigo-400">
                  {payment.providerTransactionId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Order Reference */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            Associated Order
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Order Number</span>
              <Link
                to={`/admin/orders/${payment.orderId}`}
                className="font-mono font-medium text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
              >
                {payment.orderNumber || payment.orderId}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Order ID</span>
              <span className="font-mono text-slate-400">{payment.orderId}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Customer Details */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            Customer Information
          </h3>

          <div className="space-y-2.5 text-xs">
            {payment.customer ? (
              <>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Name</span>
                  <span className="font-medium text-slate-200">
                    {payment.customer.firstName} {payment.customer.lastName}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Email</span>
                  <span className="font-mono text-slate-300">
                    {payment.customer.email}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-1">
                <span className="text-slate-400">User ID: </span>
                <span className="font-mono text-slate-300">{payment.userId}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attempts History */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4 shadow-xl">
        <PaymentAttemptHistory attempts={payment.attempts || []} />
      </div>

      {/* COD Modal */}
      {showCodModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              Confirm Cash Collection
            </h3>
            <p className="text-xs text-slate-400">
              Confirm that cash amount of{' '}
              <span className="font-bold text-slate-200">
                {payment.currency} {(payment.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>{' '}
              for Payment <span className="font-mono text-slate-200">{payment.paymentNumber}</span> has been received from the courier.
            </p>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Collection Note (Optional)
              </label>
              <textarea
                value={codNote}
                onChange={(e) => setCodNote(e.target.value)}
                placeholder="e.g. Courier agent ID, cash sheet voucher number..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-20"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCodModal(false)}
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
