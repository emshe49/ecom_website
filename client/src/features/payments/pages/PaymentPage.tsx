import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Loader2,
  Check,
  XCircle,
} from 'lucide-react';
import { ordersApi } from '../../orders/api/orders.api';
import { OrderDetailDTO } from '../../orders/orders.types';
import { paymentsApi } from '../api/payments.api';
import {
  PaymentDTO,
  PaymentMethod,
  PaymentMethodOption,
  InitiatePaymentResultDTO,
} from '../payments.types';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { PaymentAttemptHistory } from '../components/PaymentAttemptHistory';


export const PaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetailDTO | null>(null);
  const [payment, setPayment] = useState<PaymentDTO | null>(null);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('ONLINE');

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Simulation Modal state for TEST payment provider
  const [activeInitiateResult, setActiveInitiateResult] =
    useState<InitiatePaymentResultDTO | null>(null);
  const [simulatingStatus, setSimulatingStatus] = useState<boolean>(false);

  const fetchOrderAndPayment = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);

      const [orderData, paymentData, methodsData] = await Promise.all([
        ordersApi.getMyOrderById(orderId),
        paymentsApi.getPaymentByOrderId(orderId).catch(() => null),
        paymentsApi.getPaymentMethods().catch(() => [
          {
            code: 'ONLINE' as PaymentMethod,
            name: 'Online Payment',
            description: 'Credit/Debit Card & Sandbox',
            enabled: true,
            provider: 'TEST',
          },
          {
            code: 'CASH_ON_DELIVERY' as PaymentMethod,
            name: 'Cash on Delivery',
            description: 'Pay on Delivery',
            enabled: true,
            provider: 'COD',
          },
        ]),
      ]);

      setOrder(orderData);
      setPayment(paymentData);
      setMethods(methodsData);

      if (paymentData?.method) {
        setSelectedMethod(paymentData.method);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load order details'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderAndPayment();
  }, [orderId]);

  const handleInitiatePayment = async () => {
    if (!orderId || !order) return;
    try {
      setSubmitting(true);
      setError(null);

      const result = await paymentsApi.initiatePayment({
        orderId,
        method: selectedMethod,
        returnUrl: `${window.location.origin}/payment/result?orderId=${orderId}`,
      });

      setPayment(result.payment);

      if (selectedMethod === 'CASH_ON_DELIVERY') {
        // Redirect directly to order details
        navigate(`/orders/${orderId}`, {
          state: {
            notification:
              'Your order has been placed with Cash on Delivery payment!',
          },
        });
      } else {
        // Online payment provider flow
        setActiveInitiateResult(result);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to initiate payment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Simulates Sandbox Webhook Provider callbacks for testing
  const handleSimulateSandboxAction = async (outcome: 'success' | 'fail') => {
    if (!activeInitiateResult) return;
    try {
      setSimulatingStatus(true);
      setError(null);

      const paymentId = activeInitiateResult.payment.id;

      // In real sandbox, the provider redirects to returnUrl after sending webhook.

      // We trigger the reconcile or wait for status update.
      if (outcome === 'success') {
        // Navigate to payment result page
        navigate(
          `/payment/result?orderId=${orderId}&paymentId=${paymentId}&status=success`
        );
      } else {
        // Navigate to result with failure or refresh state
        navigate(
          `/payment/result?orderId=${orderId}&paymentId=${paymentId}&status=failed`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Simulation error');
    } finally {
      setSimulatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Loading payment checkout...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-rose-500/20 bg-rose-950/20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-100 mb-2">
          Unable to Load Order
        </h2>
        <p className="text-sm text-slate-400 mb-6">{error}</p>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const isPaid =
    order.paymentStatus === 'PAID' || payment?.status === 'SUCCEEDED';
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to={`/orders/${order.id}`}
              className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Order {order.orderNumber}
            </Link>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">
              Placed {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mt-1">
            Complete Payment
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              Amount Due
            </div>
            <div className="text-2xl font-black text-indigo-400">
              {order.currency} {(order.total / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* If Order is already Paid */}
      {isPaid && (
        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Payment Completed!
              </h3>
              <p className="text-sm text-slate-300 mt-0.5">
                This order is paid in full. No further payment action is needed.
              </p>
              {payment?.paidAt && (
                <p className="text-xs text-emerald-400 mt-1">
                  Settled on {new Date(payment.paidAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <Link
            to={`/orders/${order.id}`}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shrink-0"
          >
            View Order Details
          </Link>
        </div>
      )}

      {/* If Order is Cancelled */}
      {isCancelled && (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-rose-400 shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Order Cancelled
            </h3>
            <p className="text-sm text-slate-300 mt-0.5">
              This order has been cancelled and cannot accept further payments.
            </p>
          </div>
        </div>
      )}

      {/* Payment Action Grid */}
      {!isPaid && !isCancelled && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Area */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/30 flex items-start gap-3 text-rose-300 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <span className="font-semibold">Payment Error: </span>
                  {error}
                </div>
              </div>
            )}

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-6">
              <PaymentMethodSelector
                methods={methods}
                selectedMethod={selectedMethod}
                onSelect={(m) => setSelectedMethod(m)}
                disabled={submitting}
              />

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>256-bit SSL Secure Checkout</span>
                </div>

                <button
                  onClick={handleInitiatePayment}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : selectedMethod === 'ONLINE' ? (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pay Online Now
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm Cash on Delivery
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Past Attempts History */}
            {payment?.attempts && payment.attempts.length > 0 && (
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
                <PaymentAttemptHistory attempts={payment.attempts} />
              </div>
            )}
          </div>

          {/* Sidebar Order Summary */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
              <h3 className="text-base font-semibold text-slate-200">
                Order Summary
              </h3>

              <div className="space-y-3 divide-y divide-slate-800/60 text-sm">
                <div className="flex justify-between py-2 text-slate-400">
                  <span>Subtotal ({order.items.length} items)</span>
                  <span className="text-slate-200">
                    {order.currency} {(order.subtotal / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-2 text-slate-400">
                  <span>Shipping</span>
                  <span className="text-emerald-400">FREE</span>
                </div>

                <div className="flex justify-between py-3 text-base font-bold text-slate-100">
                  <span>Total Amount</span>
                  <span className="text-indigo-400">
                    {order.currency} {(order.total / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {order.shippingAddress && (
                <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 block mb-1">
                    Shipping To:
                  </span>
                  <div>{order.shippingAddress.fullName}</div>
                  <div>{order.shippingAddress.addressLine1}</div>
                  <div>
                    {order.shippingAddress.city}, {order.shippingAddress.stateProvince}{' '}
                    {order.shippingAddress.postalCode}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Online Sandbox Simulation Modal */}
      {activeInitiateResult && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl space-y-6 text-center">
            <div className="p-3.5 w-fit mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <CreditCard className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Payment Provider Sandbox
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Attempt #{activeInitiateResult.attempt.attemptNumber} initialized for{' '}
                <span className="text-slate-200 font-medium">
                  {order.currency} {(order.total / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs font-mono text-slate-400 space-y-1">
              <div>Provider: {activeInitiateResult.attempt.provider}</div>
              <div>Payment #: {activeInitiateResult.payment.paymentNumber}</div>
              <div>Attempt ID: {activeInitiateResult.attempt.id}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSimulateSandboxAction('success')}
                disabled={simulatingStatus}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Simulate Success
              </button>

              <button
                onClick={() => handleSimulateSandboxAction('fail')}
                disabled={simulatingStatus}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Simulate Decline
              </button>
            </div>

            <button
              onClick={() => setActiveInitiateResult(null)}
              className="text-xs text-slate-500 hover:text-slate-400 underline"
            >
              Cancel and Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
