import React, { useState } from 'react';
import { X, ShoppingCart, Loader2, Check } from 'lucide-react';
import { WishlistItem, WishlistVariantOption } from '../types/wishlist.types';
import { formatMoney } from '../../../utils/money';

interface WishlistVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WishlistItem;
  onMoveToCart: (variantId: string) => void;
  isMoving?: boolean;
}

export const WishlistVariantModal: React.FC<WishlistVariantModalProps> = ({
  isOpen,
  onClose,
  item,
  onMoveToCart,
  isMoving = false,
}) => {
  const activeVariants = item.variants.filter((v) => v.isActive);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    activeVariants[0]?.id || ''
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) return;
    onMoveToCart(selectedVariantId);
  };

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-5 p-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
              Select Product Option
            </span>
            <h3 className="text-base font-bold text-white line-clamp-1">
              {item.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {activeVariants.map((v: WishlistVariantOption) => {
              const isSelected = v.id === selectedVariantId;
              const attrString =
                v.attributes.map((a) => `${a.name}: ${a.value}`).join(' • ') ||
                v.sku;

              return (
                <label
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/60 shadow-md shadow-indigo-600/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {attrString}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        SKU: {v.sku}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {formatMoney(
                        v.price,
                        item.priceRange?.currency || 'USD'
                      )}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isMoving}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMoving || !selectedVariantId || !selectedVariant}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isMoving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              <span>Move to Cart</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WishlistVariantModal;
