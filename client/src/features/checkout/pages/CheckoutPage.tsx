import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ArrowRight, Loader2, AlertCircle, ShieldCheck, Truck } from 'lucide-react';
import { AxiosError } from 'axios';
import { checkoutApi } from '../api/checkout.api';
import { promotionsApi } from '../../promotions/api/promotions.api';
import { ordersApi } from '../../orders/api/orders.api';
import { cartApi } from '../../cart/api/cart.api';

import { CheckoutAddressSelector } from '../components/CheckoutAddressSelector';
import { CheckoutSummary } from '../components/CheckoutSummary';
import { CheckoutExpiredState } from '../components/CheckoutExpiredState';
import { ShippingMethodSelector } from '../../shipping/components/ShippingMethodSelector';
import { shippingApi } from '../../shipping/api/shipping.api';
import { CreateCheckoutInput } from '../types/checkout.types';
import { formatMoney } from '../../../utils/money';

interface ApiErrorData {
  error?: {
    message?: string;
    code?: string;
  };
}

export const CheckoutPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState<boolean>(true);
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);

  // 1. Check for existing active checkout session
  const {
    data: activeSession,
    isLoading: isLoadingSession,
    refetch: refetchActiveSession,
  } = useQuery({
    queryKey: ['checkout'],
    queryFn: async () => {
      try {
        const session = await checkoutApi.getActiveCheckout();
        setIsSessionExpired(false);
        return session;
      } catch (err: unknown) {
        const axiosError = err as AxiosError;
        if (axiosError?.response?.status === 410) {
          setIsSessionExpired(true);
        }
        return null;
      }
    },
    retry: false,
  });

  // 2. Load cart to show pre-checkout item summary
  const { data: cart, isLoading: isLoadingCart } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
    enabled: !activeSession,
  });

  // 3. Fetch shipping quote when shipping address is chosen
  const { data: quoteData, isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['shipping-quote', selectedShippingId],
    queryFn: async () => {
      if (!selectedShippingId) return null;
      const res = await shippingApi.getQuote(selectedShippingId);
      if (res.methods && res.methods.length > 0 && !selectedMethodId) {
        setSelectedMethodId(res.methods[0].id);
      }
      return res;
    },
    enabled: !!selectedShippingId && !activeSession,
  });

  // Create Checkout Session Mutation
  const createCheckoutMutation = useMutation({
    mutationFn: (input: CreateCheckoutInput) => checkoutApi.createCheckout(input),
    onMutate: () => {
      setErrorMessage(null);
    },
    onSuccess: (newSession) => {
      queryClient.setQueryData(['checkout'], newSession);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setIsSessionExpired(false);
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      setErrorMessage(
        axiosError?.response?.data?.error?.message ||
          'Failed to initiate checkout session. Please ensure all items are in stock.'
      );
    },
  });

  // Revalidate Checkout Mutation
  const revalidateMutation = useMutation({
    mutationFn: checkoutApi.revalidateCheckout,
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(['checkout'], updatedSession);
      setErrorMessage(null);
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      if (axiosError?.response?.status === 410) {
        setIsSessionExpired(true);
      } else {
        setErrorMessage(
          axiosError?.response?.data?.error?.message ||
            'Checkout session is no longer valid. Please start checkout again.'
        );
      }
    },
  });

  // Place Order Mutation
  const placeOrderMutation = useMutation({

    mutationFn: (customerNotes?: string) => ordersApi.createOrder({ customerNotes }),
    onMutate: () => {
      setErrorMessage(null);
    },
    onSuccess: (order) => {
      queryClient.setQueryData(['checkout'], null);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/orders/${order.id}`);
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      setErrorMessage(
        axiosError?.response?.data?.error?.message ||
          'Failed to place order. Please review your checkout or try again.'
      );
    },
  });

  // Cancel Checkout Mutation
  const cancelMutation = useMutation({
    mutationFn: checkoutApi.cancelCheckout,
    onSuccess: () => {
      queryClient.setQueryData(['checkout'], null);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      navigate('/cart');
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      setErrorMessage(
        axiosError?.response?.data?.error?.message || 'Failed to cancel checkout session.'
      );
    },
  });

  // Apply Coupon Mutation
  const applyCouponMutation = useMutation({
    mutationFn: (code: string) => promotionsApi.applyCoupon(code),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(['checkout'], updatedSession);
      setErrorMessage(null);
    },
  });

  // Remove Coupon Mutation
  const removeCouponMutation = useMutation({
    mutationFn: () => promotionsApi.removeCoupon(),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(['checkout'], updatedSession);
      setErrorMessage(null);
    },
  });

  const handleStartCheckout = () => {
    if (!selectedShippingId) {
      setErrorMessage('Please select a shipping address before proceeding.');
      return;
    }

    if (!billingSameAsShipping && !selectedBillingId) {
      setErrorMessage('Please select a billing address or choose the same as shipping.');
      return;
    }

    const input: CreateCheckoutInput = {
      shippingAddressId: selectedShippingId,
      shippingMethodId: selectedMethodId || undefined,
      billingSameAsShipping,
      billingAddressId: !billingSameAsShipping && selectedBillingId ? selectedBillingId : undefined,
    };

    createCheckoutMutation.mutate(input);
  };

  const handleRestartFromExpired = () => {
    setIsSessionExpired(false);
    queryClient.setQueryData(['checkout'], null);
    refetchActiveSession();
  };

  if (isLoadingSession || (isLoadingCart && !activeSession)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-sm font-medium">Preparing checkout environment...</span>
      </div>
    );
  }

  // 1. Expired state view
  if (isSessionExpired) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <CheckoutExpiredState
          onRestart={handleRestartFromExpired}
          isRestarting={createCheckoutMutation.isPending}
        />
      </div>
    );
  }

  // 2. Active Session Review View
  if (activeSession) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <ShoppingBag className="w-6 h-6 text-indigo-400" />
              <span>Checkout Review</span>
            </h1>
            <p className="text-xs text-slate-400">
              Review your reserved items and delivery details before placing your order.
            </p>
          </div>
        </div>

        <CheckoutSummary
          session={activeSession}
          onCancelCheckout={() => cancelMutation.mutate()}
          isCancelling={cancelMutation.isPending}
          onRevalidateCheckout={() => revalidateMutation.mutate()}
          isRevalidating={revalidateMutation.isPending}
          onPlaceOrder={(notes) => placeOrderMutation.mutate(notes)}
          isPlacingOrder={placeOrderMutation.isPending}
          onExpired={() => setIsSessionExpired(true)}
          onApplyCoupon={async (code) => {
            await applyCouponMutation.mutateAsync(code);
          }}
          onRemoveCoupon={async () => {
            await removeCouponMutation.mutateAsync();
          }}
          errorMessage={errorMessage}
        />
      </div>
    );
  }


  // 3. Pre-Checkout Address Selection View
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-indigo-400" />
            <span>Delivery & Checkout</span>
          </h1>
          <p className="text-xs text-slate-400">
            Step 1 of 2: Select destination and snapshot fulfillment addresses.
          </p>
        </div>

        <Link
          to="/cart"
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cart</span>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Address Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <CheckoutAddressSelector
              selectedShippingId={selectedShippingId}
              onSelectShipping={(id) => {
                setSelectedShippingId(id);
                setErrorMessage(null);
              }}
              billingSameAsShipping={billingSameAsShipping}
              onToggleBillingSame={(same) => {
                setBillingSameAsShipping(same);
                setErrorMessage(null);
              }}
              selectedBillingId={selectedBillingId}
              onSelectBilling={(id) => {
                setSelectedBillingId(id);
                setErrorMessage(null);
              }}
            />
          </div>

          {/* Step 1.2: Shipping Method Selection */}
          {selectedShippingId && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-400" />
                  <span>Delivery Method & Shipping Speed</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Calculated for destination
                </span>
              </div>

              <ShippingMethodSelector
                methods={quoteData?.methods || []}
                selectedMethodId={selectedMethodId}
                onSelect={(m) => setSelectedMethodId(m.id)}
                isLoading={isLoadingQuotes}
              />
            </div>
          )}
        </div>

        {/* Right: Cart Summary Confirmation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl sticky top-24 backdrop-blur-md">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
              Order Preview
            </h3>

            {cart && cart.items.length > 0 ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cart.items.map((item) => (
                    <div key={item.variantId} className="flex justify-between items-center text-slate-300">
                      <span className="truncate pr-2 font-medium">
                        {item.productName} ({item.quantity}×)
                      </span>
                      <span className="font-mono text-slate-100 font-semibold flex-shrink-0">
                        {formatMoney(item.lineTotal, cart.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Estimated Subtotal</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {formatMoney(cart.subtotal, cart.currency)}
                  </span>
                </div>

              </div>
            ) : (
              <p className="text-xs text-slate-400">Cart details loaded.</p>
            )}

            <button
              type="button"
              onClick={handleStartCheckout}
              disabled={createCheckoutMutation.isPending || !selectedShippingId}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {createCheckoutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reserving Inventory...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Reserve Stock</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live 15-min stock hold guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
