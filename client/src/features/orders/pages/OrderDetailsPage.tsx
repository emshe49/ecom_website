import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersApi } from '../api/orders.api';
import { OrderDetailDTO } from '../orders.types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import { OrderTimeline } from '../components/OrderTimeline';
import { OrderItemsTable } from '../components/OrderItemsTable';
import { CancelOrderModal } from '../components/CancelOrderModal';
import {
  ArrowLeft,
  MapPin,
  FileText,
  CreditCard,
  AlertCircle,
} from 'lucide-react';

export const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const [order, setOrder] = useState<OrderDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const fetchOrderDetail = async () => {
    if (!orderId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await ordersApi.getMyOrderById(orderId);
      setOrder(data);
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

  const handleCancelConfirm = async (reason: string) => {
    if (!order) return;
    try {
      setIsCancelling(true);
      const updated = await ordersApi.cancelMyOrder(order.id, { reason });
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4" />
        <div className="h-32 bg-slate-850 rounded-2xl" />
        <div className="h-64 bg-slate-850 rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">
          {error || 'Order Not Found'}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          The requested order could not be located or you do not have permission to view it.
        </p>
        <Link
          to="/orders"
          className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Orders</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/orders"
          className="inline-flex items-center text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 space-x-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Orders</span>
        </Link>

        {order.canCancel && (
          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="self-start sm:self-auto px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            Cancel Order
          </button>
        )}
      </div>

      {/* Header Card */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-wide">
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
              Total Amount
            </p>
            <p className="text-2xl font-extrabold text-indigo-400 mt-0.5">
              {formatPrice(order.total, order.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Lifecycle Progress Tracker */}
      <OrderTimeline
        currentStatus={order.status}
        statusHistory={order.statusHistory}
      />

      {/* Items Table Snapshot */}
      <OrderItemsTable items={order.items} currency={order.currency} />

      {/* Addresses & Financial Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shipping Address */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center space-x-2 text-indigo-400 mb-3">
            <MapPin className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-slate-200">Shipping Address</h3>
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
            <h3 className="text-sm font-semibold text-slate-200">Billing Address</h3>
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

        {/* Summary Breakdown */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 mb-3">
              <FileText className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-slate-200">Payment Summary</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Items Subtotal</span>
                <span>{formatPrice(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Shipping</span>
                <span className="text-emerald-400 font-medium">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Taxes</span>
                <span>Included</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4 flex justify-between items-baseline">
            <span className="text-sm font-bold text-slate-100">Total</span>
            <span className="text-lg font-extrabold text-indigo-400">
              {formatPrice(order.total, order.currency)}
            </span>
          </div>
        </div>
      </div>


      {/* Customer Notes (if present) */}
      {order.customerNotes && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-300">
          <span className="font-semibold text-slate-200 block mb-1">Your Delivery Instructions:</span>
          <p className="text-slate-400 italic">"{order.customerNotes}"</p>
        </div>
      )}

      {/* Cancellation Modal */}
      <CancelOrderModal
        isOpen={isCancelModalOpen}
        orderNumber={order.orderNumber}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
      />
    </div>
  );
};
