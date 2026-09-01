import React from 'react';
import { Package } from 'lucide-react';
import { CheckoutItemSnapshot } from '../types/checkout.types';
import { formatMoney } from '../../../utils/money';

interface CheckoutItemProps {
  item: CheckoutItemSnapshot;
  currency: string;
}

export const CheckoutItem: React.FC<CheckoutItemProps> = ({ item, currency }) => {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-800/80 last:border-0">
      {/* Product Image */}
      <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {item.primaryImage ? (
          <img
            src={item.primaryImage}
            alt={item.productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-6 h-6 text-slate-600" />
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="text-sm font-semibold text-white truncate" title={item.productName}>
          {item.productName}
        </h4>

        {/* Variant Attributes & SKU */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          <span className="font-mono text-[11px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700/50">
            {item.sku}
          </span>
          {item.variantAttributes.map((attr) => (
            <span
              key={attr.name}
              className="bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 px-1.5 py-0.5 rounded text-[11px]"
            >
              {attr.name}: <span className="font-semibold text-slate-200">{attr.value}</span>
            </span>
          ))}
        </div>

        {/* Quantity & Unit Price */}
        <div className="text-xs text-slate-400">
          <span>Qty: </span>
          <span className="font-mono font-semibold text-slate-200">{item.quantity}</span>
          <span className="text-slate-600 mx-1.5">×</span>
          <span className="font-mono">{formatMoney(item.unitPrice, currency)}</span>
        </div>
      </div>

      {/* Line Total */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold font-mono text-emerald-400">
          {formatMoney(item.lineTotal, currency)}
        </div>
      </div>
    </div>
  );
};
