import React from 'react';
import { Truck, Sparkles, Clock, Check, AlertCircle } from 'lucide-react';
import { EligibleShippingMethodDTO } from '../types/shipping.types';
import { formatMoney } from '../../../utils/money';

interface ShippingMethodSelectorProps {
  methods: EligibleShippingMethodDTO[];
  selectedMethodId: string | null;
  onSelect: (method: EligibleShippingMethodDTO) => void;
  isLoading?: boolean;
}

export const ShippingMethodSelector: React.FC<ShippingMethodSelectorProps> = ({
  methods,
  selectedMethodId,
  onSelect,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
        <div className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!methods || methods.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-xs font-medium">
          No shipping methods available for the selected address. Please select or add a supported shipping address.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methods.map((method) => {
          const isSelected = selectedMethodId === method.id;
          const isFree = method.fee === 0;

          return (
            <div
              key={method.id}
              onClick={() => onSelect(method)}
              className={`relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-600/20 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white">
                      {method.name}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {method.estimatedMinDays}–{method.estimatedMaxDays} business days
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {isFree ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                      <Sparkles className="w-3 h-3" /> FREE
                    </span>
                  ) : (
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                      {formatMoney(method.fee, method.currency)}
                    </span>
                  )}
                </div>
              </div>

              {method.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 line-clamp-2">
                  {method.description}
                </p>
              )}

              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
