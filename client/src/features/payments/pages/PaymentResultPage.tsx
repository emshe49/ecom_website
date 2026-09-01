import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
import { paymentsApi } from '../api/payments.api';
import { ordersApi } from '../../orders/api/orders.api';
import { PaymentDTO } from '../payments.types';
import { OrderDetailDTO } from '../../orders/orders.types';

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get('orderId');
  const statusParam = searchParams.get('status');

  const [order, setOrder] = useState<OrderDetailDTO | null>(null);
  const [payment, setPayment] = useState<PaymentDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 5;

    const checkStatus = async () => {
      try {
        const [orderData, paymentData] = await Promise.all([
          ordersApi.getMyOrderById(orderId),
          paymentsApi.getPaymentByOrderId(orderId).catch(() => null),
        ]);

        if (isMounted) {
          setOrder(orderData);
          setPayment(paymentData);
          setLoading(false);

          // If payment is processing/pending and we have simulated success, retry polling
          if (
            statusParam === 'success' &&
            paymentData?.status !== 'SUCCEEDED' &&
            pollCount < maxPolls
          ) {
            pollCount++;
            setTimeout(checkStatus, 1500);
          }
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [orderId, statusParam]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400">Verifying payment status with provider...</p>
      </div>
    );
  }

  const isSuccess =
    statusParam === 'success' ||
    payment?.status === 'SUCCEEDED' ||
    order?.paymentStatus === 'PAID';

  const isPending =
    payment?.status === 'PENDING' ||
    payment?.status === 'PROCESSING' ||
    order?.paymentStatus === 'UNPAID';


  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      {isSuccess ? (
        <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 shadow-2xl space-y-6">
          <div className="p-4 w-fit mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Payment Successful!
            </h1>
            <p className="text-sm text-slate-300 mt-2">
              Thank you! Your payment has been processed and verified. We are now preparing your order for fulfillment.
            </p>
          </div>

          {payment && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400 space-y-1 text-left">
              <div>Payment Reference: {payment.paymentNumber}</div>
              <div>Order Reference: {order?.orderNumber}</div>
              <div>
                Amount Paid: {payment.currency} {(payment.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              {payment.paidAt && (
                <div>Paid At: {new Date(payment.paidAt).toLocaleString()}</div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to={`/orders/${orderId}`}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/25"
            >
              View Order Details <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/products"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : isPending ? (
        <div className="p-8 rounded-2xl border border-amber-500/30 bg-amber-950/20 shadow-2xl space-y-6">
          <div className="p-4 w-fit mx-auto rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-12 h-12" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Payment Processing / Pending
            </h1>
            <p className="text-sm text-slate-300 mt-2">
              We have received your payment initiation. Once the transaction confirms, your order will update to Paid automatically.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to={`/orders/${orderId}`}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              View Order
            </Link>
            <Link
              to={`/orders/${orderId}/payment`}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              Payment Options
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-950/20 shadow-2xl space-y-6">
          <div className="p-4 w-fit mx-auto rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="w-12 h-12" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Payment Failed or Declined
            </h1>
            <p className="text-sm text-slate-300 mt-2">
              The payment attempt was not completed. Your items and order reservation remain safe. You can retry with another payment method.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to={`/orders/${orderId}/payment`}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/25"
            >
              <RotateCcw className="w-4 h-4" /> Retry Payment
            </Link>
            <Link
              to={`/orders/${orderId}`}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              Back to Order
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
