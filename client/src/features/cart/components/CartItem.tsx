import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, AlertTriangle, PackageX } from 'lucide-react';
import { CartItem as CartItemType } from '../types/cart.types';
import { QuantityControl } from './QuantityControl';
import { formatMoney } from '../../../utils/money';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (variantId: string, newQuantity: number) => void;
  onRemove: (variantId: string) => void;
  isUpdating?: boolean;
  isRemoving?: boolean;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating = false,
  isRemoving = false,
}) => {
  const getUnavailableMessage = (reason?: string | null) => {
    switch (reason) {
      case 'VARIANT_INACTIVE':
        return 'Selected variant is currently inactive or out of rotation.';
      case 'PRODUCT_INACTIVE':
        return 'Product is currently inactive and cannot be purchased.';
      case 'CATEGORY_INACTIVE':
        return 'Product category is temporarily deactivated.';
      case 'BRAND_INACTIVE':
        return 'Product brand is currently inactive.';
      case 'VARIANT_NOT_FOUND':
        return 'This variant no longer exists in our catalog.';
      case 'PRODUCT_NOT_FOUND':
        return 'This product no longer exists in our catalog.';
      default:
        return 'This item is currently unavailable.';
    }
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        !item.isAvailable
          ? 'bg-rose-950/20 border-rose-900/40 opacity-90'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80 shadow-md'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Product Image & Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
            {item.primaryImage ? (
              <img
                src={item.primaryImage}
                alt={item.productName || item.sku || 'Cart Item'}
                className="w-full h-full object-cover"
              />
            ) : (
              <PackageX className="w-6 h-6 text-slate-600" />
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            {item.productSlug && item.isAvailable ? (
              <Link
                to={`/products/${item.productSlug}`}
                className="font-bold text-sm sm:text-base text-white hover:text-indigo-400 transition-colors line-clamp-1"
              >
                {item.productName || 'Unnamed Product'}
              </Link>
            ) : (
              <span className="font-bold text-sm sm:text-base text-slate-300 line-clamp-1">
                {item.productName || 'Unavailable Item'}
              </span>
            )}

            {/* Variant Attributes & SKU */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {item.variantAttributes && item.variantAttributes.length > 0 ? (
                <span>
                  {item.variantAttributes
                    .map((a) => `${a.name}: ${a.value}`)
                    .join(' • ')}
                </span>
              ) : null}
              {item.sku && (
                <span className="font-mono text-[11px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {item.sku}
                </span>
              )}
            </div>

            {/* Availability Warning */}
            {!item.isAvailable && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{getUnavailableMessage(item.unavailableReason)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing, Quantity Controls & Remove Action */}
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
          {/* Unit Price & Line Total */}
          <div className="text-left sm:text-right space-y-0.5">
            {item.isAvailable ? (
              <>
                <div className="font-black text-emerald-400 font-mono text-base">
                  {formatMoney(item.lineTotal, item.currency)}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {formatMoney(item.unitPrice, item.currency)} each
                </div>
              </>
            ) : (
              <div className="text-xs font-semibold text-rose-400 italic">
                Excluded from subtotal
              </div>
            )}
          </div>

          {/* Quantity Controls */}
          {item.isAvailable ? (
            <QuantityControl
              quantity={item.quantity}
              onChange={(newQty) => onUpdateQuantity(item.variantId, newQty)}
              isLoading={isUpdating}
              disabled={isRemoving}
            />
          ) : (
            <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
              Qty: {item.quantity}
            </span>
          )}

          {/* Remove Button */}
          <button
            type="button"
            onClick={() => onRemove(item.variantId)}
            disabled={isRemoving}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors border border-transparent hover:border-rose-900/40 cursor-pointer disabled:opacity-30"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
