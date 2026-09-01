import React from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { useAuthStore } from '../../auth/store/auth.store';

interface WishlistButtonProps {
  productId: string;
  productName?: string;
  variant?: 'icon' | 'button' | 'pill';
  className?: string;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  productName = 'Product',
  variant = 'icon',
  className = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { isSaved, addMutation, removeMutation } = useWishlist();

  const saved = isSaved(productId);
  const isPending =
    (addMutation.isPending && addMutation.variables === productId) ||
    (removeMutation.isPending && removeMutation.variables === productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (user?.role !== 'CUSTOMER') {
      return;
    }

    if (saved) {
      removeMutation.mutate(productId);
    } else {
      addMutation.mutate(productId);
    }
  };

  const ariaLabel = saved
    ? `Remove ${productName} from wishlist`
    : `Add ${productName} to wishlist`;

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={ariaLabel}
        className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl border font-semibold text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 ${
          saved
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
        } ${className}`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : (
          <Heart
            className={`w-4 h-4 transition-transform duration-200 active:scale-125 ${
              saved ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
            }`}
          />
        )}
        <span>{saved ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
      </button>
    );
  }

  // Default icon variant
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={ariaLabel}
      title={saved ? 'Remove from Wishlist' : 'Save to Wishlist'}
      className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-95 ${
        saved
          ? 'bg-rose-950/80 border border-rose-800/60 text-rose-400 shadow-md shadow-rose-950/40 hover:bg-rose-900/80'
          : 'bg-slate-950/70 border border-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-slate-900/90 shadow-md'
      } ${className}`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <Heart
          className={`w-4 h-4 transition-all duration-200 ${
            saved
              ? 'fill-rose-500 text-rose-500 scale-110'
              : 'text-slate-400 hover:text-rose-400'
          }`}
        />
      )}
    </button>
  );
};

export default WishlistButton;
