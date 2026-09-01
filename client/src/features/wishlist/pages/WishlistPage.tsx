import React, { useState } from 'react';
import { Heart, Trash2, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useWishlist } from '../hooks/useWishlist';
import { WishlistItem } from '../types/wishlist.types';
import { WishlistItemCard } from '../components/WishlistItemCard';
import { WishlistEmptyState } from '../components/WishlistEmptyState';
import { WishlistVariantModal } from '../components/WishlistVariantModal';
import { cartApi } from '../../cart/api/cart.api';
import { wishlistApi } from '../api/wishlist.api';

interface ApiErrorData {
  error?: {
    message?: string;
    code?: string;
  };
}

export const WishlistPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { wishlist, itemCount, isLoading, removeMutation, clearMutation } = useWishlist();

  const [activeRemovingProductId, setActiveRemovingProductId] = useState<string | null>(null);
  const [activeMovingItem, setActiveMovingItem] = useState<WishlistItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Move to Cart Mutation (Add to Cart -> On success Remove from Wishlist)
  const moveToCartMutation = useMutation({
    mutationFn: async ({
      productId,
      variantId,
    }: {
      productId: string;
      variantId: string;
    }) => {
      // 1. Add to cart
      const updatedCart = await cartApi.addToCart({
        variantId,
        quantity: 1,
      });
      // 2. Remove from wishlist
      const updatedWishlist = await wishlistApi.removeItem(productId);
      return { updatedCart, updatedWishlist };
    },
    onSuccess: ({ updatedCart, updatedWishlist }) => {
      queryClient.setQueryData(['cart'], updatedCart);
      queryClient.setQueryData(['wishlist'], updatedWishlist);
      setIsModalOpen(false);
      setActiveMovingItem(null);
      showFeedback('success', 'Product moved to your shopping cart!');
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<ApiErrorData>;
      const msg =
        axiosError?.response?.data?.error?.message ||
        'Failed to move product to cart.';
      showFeedback('error', msg);
    },
    onSettled: () => {
      setActiveMovingItem(null);
    },
  });

  const handleInitiateMoveToCart = (item: WishlistItem) => {
    const activeVariants = item.variants.filter((v) => v.isActive);

    if (activeVariants.length === 0) {
      showFeedback('error', 'This product currently has no active variants.');
      return;
    }

    if (activeVariants.length === 1) {
      // Single variant -> Move immediately
      setActiveMovingItem(item);
      moveToCartMutation.mutate({
        productId: item.productId,
        variantId: activeVariants[0].id,
      });
    } else {
      // Multi-variant -> Open option selector modal
      setActiveMovingItem(item);
      setIsModalOpen(true);
    }
  };

  const handleModalSelectVariant = (variantId: string) => {
    if (!activeMovingItem) return;
    moveToCartMutation.mutate({
      productId: activeMovingItem.productId,
      variantId,
    });
  };

  const handleRemove = (productId: string) => {
    setActiveRemovingProductId(productId);
    removeMutation.mutate(productId, {
      onSuccess: () => {
        showFeedback('success', 'Product removed from wishlist.');
      },
      onError: (err: unknown) => {
        const axiosError = err as AxiosError<ApiErrorData>;
        showFeedback(
          'error',
          axiosError?.response?.data?.error?.message ||
            'Failed to remove product from wishlist.'
        );
      },
      onSettled: () => {
        setActiveRemovingProductId(null);
      },
    });
  };

  const handleClear = () => {
    clearMutation.mutate(undefined, {
      onSuccess: () => {
        setShowClearConfirm(false);
        showFeedback('success', 'Wishlist cleared.');
      },
      onError: (err: unknown) => {
        const axiosError = err as AxiosError<ApiErrorData>;
        showFeedback(
          'error',
          axiosError?.response?.data?.error?.message ||
            'Failed to clear wishlist.'
        );
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm text-slate-400 font-medium">
          Loading your saved items...
        </p>
      </div>
    );
  }

  const items = wishlist?.items || [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500/20" />
            <span>My Wishlist</span>
            {itemCount > 0 && (
              <span className="text-sm font-mono px-3 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Keep track of items you love and move them to your cart whenever you are ready.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/60 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Wishlist</span>
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {notification && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Content */}
      {items.length === 0 ? (
        <WishlistEmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <WishlistItemCard
              key={item.productId}
              item={item}
              onRemove={handleRemove}
              onMoveToCart={handleInitiateMoveToCart}
              isRemoving={activeRemovingProductId === item.productId}
              isMoving={
                moveToCartMutation.isPending &&
                activeMovingItem?.productId === item.productId
              }
            />
          ))}
        </div>
      )}

      {/* Multi-Variant Selector Modal */}
      {activeMovingItem && (
        <WishlistVariantModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setActiveMovingItem(null);
          }}
          item={activeMovingItem}
          onMoveToCart={handleModalSelectVariant}
          isMoving={moveToCartMutation.isPending}
        />
      )}

      {/* Clear Wishlist Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-bold text-white">Clear Wishlist</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to remove all saved items from your wishlist?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearMutation.isPending}
                className="py-2 px-4 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={clearMutation.isPending}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30"
              >
                {clearMutation.isPending ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
