import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingCart, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { WishlistItem } from '../types/wishlist.types';
import { formatMoney } from '../../../utils/money';

interface WishlistItemCardProps {
  item: WishlistItem;
  onRemove: (productId: string) => void;
  onMoveToCart: (item: WishlistItem) => void;
  isRemoving?: boolean;
  isMoving?: boolean;
}

export const WishlistItemCard: React.FC<WishlistItemCardProps> = ({
  item,
  onRemove,
  onMoveToCart,
  isRemoving = false,
  isMoving = false,
}) => {
  const formatUnavailableReason = (reason: string | null) => {
    switch (reason) {
      case 'PRODUCT_NOT_FOUND':
        return 'Product has been removed from catalog';
      case 'PRODUCT_DRAFT':
      case 'PRODUCT_INACTIVE':
      case 'PRODUCT_ARCHIVED':
        return 'Product is currently unlisted';
      case 'CATEGORY_INACTIVE':
        return 'Product category is temporarily unavailable';
      case 'BRAND_INACTIVE':
        return 'Product brand is temporarily unavailable';
      case 'NO_ACTIVE_VARIANTS':
        return 'All options currently out of stock';
      default:
        return 'Currently unavailable';
    }
  };

  const renderPrice = () => {
    if (!item.priceRange) {
      return (
        <span className="text-slate-500 text-xs italic">Price unavailable</span>
      );
    }
    const { min, max, currency } = item.priceRange;
    if (min === max) {
      return (
        <span className="text-base font-bold text-emerald-400 font-mono">
          {formatMoney(min, currency)}
        </span>
      );
    }
    return (
      <span className="text-sm font-bold text-emerald-400 font-mono">
        {formatMoney(min, currency)} – {formatMoney(max, currency)}
      </span>
    );
  };

  return (
    <div
      className={`group relative flex flex-col bg-slate-900/70 border rounded-2xl overflow-hidden shadow-lg transition-all duration-200 ${
        item.isAvailable
          ? 'border-slate-800 hover:border-slate-700'
          : 'border-rose-900/40 bg-rose-950/10'
      }`}
    >
      {/* Product Image Area */}
      <div className="relative w-full aspect-square bg-slate-950/80 overflow-hidden flex items-center justify-center border-b border-slate-800/80">
        {item.primaryImage ? (
          <img
            src={item.primaryImage}
            alt={item.name || 'Product Image'}
            className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ${
              !item.isAvailable ? 'grayscale opacity-60' : ''
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-2xl">
            {item.name ? item.name[0] : 'P'}
          </div>
        )}

        {/* Unavailable Banner */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-800/80 text-rose-300 text-xs font-semibold shadow-lg">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Unavailable</span>
            </span>
          </div>
        )}

        {/* Variant Count Tag */}
        {item.isAvailable && item.availableVariantCount > 1 && (
          <div className="absolute bottom-3 right-3">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-950/80 text-slate-300 border border-slate-800 backdrop-blur-sm">
              {item.availableVariantCount} Options
            </span>
          </div>
        )}

        {/* Top-Right Remove Button */}
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          disabled={isRemoving}
          aria-label={`Remove ${item.name || 'product'} from wishlist`}
          title="Remove from Wishlist"
          className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/80 transition-all cursor-pointer shadow-md disabled:opacity-50"
        >
          {isRemoving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{item.category?.name || 'Catalog'}</span>
            {item.brand && (
              <span className="font-medium text-indigo-400">{item.brand.name}</span>
            )}
          </div>

          {item.slug ? (
            <Link
              to={`/products/${item.slug}`}
              className="text-sm font-semibold text-slate-100 hover:text-indigo-300 transition-colors line-clamp-2 leading-snug"
            >
              {item.name}
            </Link>
          ) : (
            <h3 className="text-sm font-semibold text-slate-400 line-clamp-2 leading-snug">
              {item.name || 'Unavailable Product'}
            </h3>
          )}

          {/* Pricing or unavailable reason */}
          <div className="pt-1">
            {item.isAvailable ? (
              renderPrice()
            ) : (
              <p className="text-xs text-rose-400 font-medium">
                {formatUnavailableReason(item.unavailableReason)}
              </p>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
          {item.isAvailable ? (
            <button
              type="button"
              onClick={() => onMoveToCart(item)}
              disabled={isMoving}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              {isMoving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShoppingCart className="w-3.5 h-3.5" />
              )}
              <span>Move to Cart</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={true}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 text-slate-500 text-xs font-semibold border border-slate-700/50 cursor-not-allowed"
            >
              Unavailable
            </button>
          )}

          {item.slug && item.isAvailable && (
            <Link
              to={`/products/${item.slug}`}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              title="View Product Details"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default WishlistItemCard;
