import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { cartApi } from '../api/cart.api';
import { CartItem } from '../components/CartItem';
import { CartSummary } from '../components/CartSummary';
import { EmptyCart } from '../components/EmptyCart';

interface ApiErrorData {
  error?: {
    message?: string;
    code?: string;
  };
}

export const CartPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeUpdatingVariantId, setActiveUpdatingVariantId] = useState<string | null>(null);
  const [activeRemovingVariantId, setActiveRemovingVariantId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  const updateMutation = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      cartApi.updateCartItem(variantId, { quantity }),
    onMutate: ({ variantId }) => {
      setActiveUpdatingVariantId(variantId);
      setErrorMessage(null);
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      setErrorMessage(
        axiosError?.response?.data?.error?.message || 'Failed to update item quantity.'
      );
    },
    onSettled: () => {
      setActiveUpdatingVariantId(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (variantId: string) => cartApi.removeCartItem(variantId),
    onMutate: (variantId) => {
      setActiveRemovingVariantId(variantId);
      setErrorMessage(null);
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      setErrorMessage(
        axiosError?.response?.data?.error?.message || 'Failed to remove item from cart.'
      );
    },
    onSettled: () => {
      setActiveRemovingVariantId(null);
    },
  });

  const clearMutation = useMutation({
    mutationFn: cartApi.clearCart,
    onMutate: () => {
      setErrorMessage(null);
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
      setShowClearConfirm(false);
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      setErrorMessage(
        axiosError?.response?.data?.error?.message || 'Failed to clear shopping cart.'
      );
    },
  });


  const handleUpdateQuantity = (variantId: string, quantity: number) => {
    updateMutation.mutate({ variantId, quantity });
  };

  const handleRemoveItem = (variantId: string) => {
    removeMutation.mutate(variantId);
  };

  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    clearMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4 animate-fadeIn">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
        <p className="text-sm text-slate-400">Loading your shopping cart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Failed to Load Cart</h2>
        <p className="text-xs text-slate-400">
          We encountered an issue fetching your shopping cart. Please check your network connection or try again.
        </p>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['cart'] })}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-indigo-400" />
            <span>Shopping Cart</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Review your selected product variants, update quantities, and prepare for checkout.
          </p>
        </div>

        <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-300 self-start sm:self-auto">
          {cart.itemCount} distinct item{cart.itemCount !== 1 ? 's' : ''} ({cart.totalQuantity} unit{cart.totalQuantity !== 1 ? 's' : ''})
        </div>
      </div>

      {/* Mutation Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-400 hover:text-white font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Items List + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <CartItem
              key={item.variantId}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveItem}
              isUpdating={activeUpdatingVariantId === item.variantId}
              isRemoving={activeRemovingVariantId === item.variantId}
            />
          ))}
        </div>

        {/* Right: Cart Summary Panel */}
        <div className="lg:col-span-1">
          <CartSummary
            cart={cart}
            onClearCart={handleClearCart}
            isClearing={clearMutation.isPending}
          />
        </div>
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Clear Shopping Cart?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to remove all items from your cart? This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearMutation.isPending}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearCart}
                disabled={clearMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {clearMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Clear All Items</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
