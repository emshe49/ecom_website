import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersApi } from '../api/orders.api';
import { AdminOrderDetailDTO, OrderStatus } from '../orders.types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { OrderTimeline } from '../components/OrderTimeline';
import { OrderItemsTable } from '../components/OrderItemsTable';
import { CancelOrderModal } from '../components/CancelOrderModal';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  User,
  CheckSquare,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

export const AdminOrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const [order, setOrder] = useState<AdminOrderDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status transition state
  const [selectedNextStatus, setSelectedNextStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null);

  // Internal notes state
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [notesSuccessMessage, setNotesSuccessMessage] = useState<string | null>(null);

  // Cancellation modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const fetchOrderDetail = async () => {
    if (!orderId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await ordersApi.getAdminOrderById(orderId);
      setOrder(data);
      setInternalNotes(data.internalNotes || '');
      if (data.allowedNextStatuses && data.allowedNextStatuses.length > 0) {
        setSelectedNextStatus(data.allowedNextStatuses[0]);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Failed to load order details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !selectedNextStatus) return;
    try {
      setIsUpdatingStatus(true);
      setStatusSuccessMessage(null);
      const updated = await ordersApi.updateAdminOrderStatus(order.id, {
        status: selectedNextStatus as OrderStatus,
        note: statusNote.trim() || undefined,
      });
      setOrder(updated);
      setStatusNote('');
      if (updated.allowedNextStatuses && updated.allowedNextStatuses.length > 0) {
        setSelectedNextStatus(updated.allowedNextStatuses[0]);
      } else {
        setSelectedNextStatus('');
      }
      setStatusSuccessMessage(`Order moved to ${selectedNextStatus.replace(/_/g, ' ')} successfully.`);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errorObj?.response?.data?.message || errorObj?.message || 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!order) return;
    try {
      setIsSavingNotes(true);
      setNotesSuccessMessage(null);
      const updated = await ordersApi.updateAdminInternalNotes(order.id, {
        internalNotes,
      });
      setOrder(updated);
      setNotesSuccessMessage('Internal notes saved successfully.');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errorObj?.response?.data?.message || errorObj?.message || 'Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAdminCancelConfirm = async (reason: string) => {
    if (!order) return;
    try {
      setIsCancelling(true);
      const updated = await ordersApi.cancelAdminOrder(order.id, { reason });
      setOrder(updated);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatPrice = (minorUnits: number, currency = 'PKR') => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(minorUnits / 100);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4" />
        <div className="h-32 bg-slate-850 rounded-2xl" />
        <div className="h-64 bg-slate-850 rounded-2xl" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Error Loading Order</h2>
        <p className="text-sm text-slate-400 mb-6">{error}</p>
        <Link
          to="/admin/orders"
          className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Orders</span>
        </Link>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/orders"
          className="inline-flex items-center text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 space-x-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Order Management</span>
        </Link>

        {order.canAdminCancel && (
          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="self-start sm:self-auto px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            Cancel Order (Admin Override)
          </button>
        )}
      </div>

      {/* Main Order Status Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-mono font-bold text-white tracking-wide">
                {order.orderNumber}
              </h1>
              <OrderStatusBadge status={order.status} size="lg" />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Placed on {new Date(order.placedAt || order.createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Total Order Value
            </p>
            <p className="text-2xl font-extrabold text-indigo-400 mt-0.5">
              {formatPrice(order.total, order.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Status Transition Control (if order is not finalized) */}
      {order.allowedNextStatuses && order.allowedNextStatuses.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-950/30 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 text-indigo-400 mb-4">
            <CheckSquare className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-100">
              Advance Warehouse Fulfillment Status
            </h2>
          </div>

          {statusSuccessMessage && (
            <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs">
              {statusSuccessMessage}
            </div>
          )}

          <form onSubmit={handleStatusUpdate} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Next State
              </label>
              <select
                value={selectedNextStatus}
                onChange={(e) => setSelectedNextStatus(e.target.value)}
                disabled={isUpdatingStatus}
                className="w-full px-3.5 py-2.5 bg-slate-850 border border-slate-700/80 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {order.allowedNextStatuses.map((st) => (
                  <option key={st} value={st}>
                    Move to {st.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-1/2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Status Change Note / Carrier Tracking (Optional)
              </label>
              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Dispatched with TCS Tracking #987654321"
                disabled={isUpdatingStatus}
                className="w-full px-3.5 py-2.5 bg-slate-850 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingStatus || !selectedNextStatus}
              className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isUpdatingStatus ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Status</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Progress Timeline */}
      <OrderTimeline
        currentStatus={order.status}
        statusHistory={order.statusHistory}
      />

      {/* Items Snapshot Table */}
      <OrderItemsTable items={order.items} currency={order.currency} />

      {/* Customer & Address Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Snapshot */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-2 text-indigo-400 mb-3">
            <User className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-slate-200">Customer Details</h3>
          </div>
          <div className="text-xs text-slate-300 space-y-1.5">
            <p className="font-semibold text-slate-100">
              {order.customerSnapshot.firstName} {order.customerSnapshot.lastName}
            </p>
            <p className="text-slate-400">{order.customerSnapshot.email}</p>
            {order.customerSnapshot.phone && (
              <p className="text-slate-400">{order.customerSnapshot.phone}</p>
            )}
            <p className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
              User ID: {order.userId}
            </p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-2 text-indigo-400 mb-3">
            <MapPin className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-slate-200">Shipping Destination</h3>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-slate-100">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.phone}</p>
            <p className="text-slate-400">{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && (
              <p className="text-slate-400">{order.shippingAddress.addressLine2}</p>
            )}
            <p className="text-slate-400">
              {order.shippingAddress.city}, {order.shippingAddress.stateProvince}{' '}
              {order.shippingAddress.postalCode}
            </p>
            <p className="text-slate-400">{order.shippingAddress.country}</p>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-2 text-indigo-400 mb-3">
            <CreditCard className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-slate-200">Billing Information</h3>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-slate-100">{order.billingAddress.fullName}</p>
            <p>{order.billingAddress.phone}</p>
            <p className="text-slate-400">{order.billingAddress.addressLine1}</p>
            {order.billingAddress.addressLine2 && (
              <p className="text-slate-400">{order.billingAddress.addressLine2}</p>
            )}
            <p className="text-slate-400">
              {order.billingAddress.city}, {order.billingAddress.stateProvince}{' '}
              {order.billingAddress.postalCode}
            </p>
            <p className="text-slate-400">{order.billingAddress.country}</p>
          </div>
        </div>
      </div>

      {/* Admin Internal Notes & Customer Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Internal Administrative Notes */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-400">
              <MessageSquare className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-slate-200">
                Internal Administrative Notes (Staff Only)
              </h3>
            </div>
            {notesSuccessMessage && (
              <span className="text-[11px] text-emerald-400 font-medium">Saved</span>
            )}
          </div>

          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={4}
            placeholder="Add internal notes visible only to operations & support staff..."
            className="w-full rounded-xl bg-slate-850 border border-slate-700/80 p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveInternalNotes}
              disabled={isSavingNotes}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSavingNotes ? 'Saving...' : 'Save Internal Note'}
            </button>
          </div>
        </div>

        {/* Audit Status Transition History */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Audit Status Transition Log
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-2.5 text-xs">
            {order.statusHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-850/60 border border-slate-800 flex justify-between items-start"
              >
                <div>
                  <span className="font-semibold text-indigo-300">{item.status}</span>
                  {item.note && (
                    <p className="text-slate-400 text-[11px] mt-0.5">{item.note}</p>
                  )}
                  <p className="text-slate-500 text-[10px] mt-0.5">By: {item.changedBy}</p>
                </div>
                <span className="text-slate-500 text-[10px] whitespace-nowrap">
                  {new Date(item.changedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={isCancelModalOpen}
        orderNumber={order.orderNumber}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleAdminCancelConfirm}
        isLoading={isCancelling}
      />
    </div>
  );
};
