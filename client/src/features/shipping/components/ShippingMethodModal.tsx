import React, { useState } from 'react';
import { X, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import {
  ShippingMethodDTO,
  SHIPPING_METHOD_TYPE,
  ShippingMethodType,
  CreateShippingMethodInput,
  UpdateShippingMethodInput,
} from '../types/shipping.types';

interface ShippingMethodModalProps {
  method?: ShippingMethodDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateShippingMethodInput | UpdateShippingMethodInput) => Promise<void>;
  isLoading?: boolean;
}

export const ShippingMethodModal: React.FC<ShippingMethodModalProps> = ({
  method,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = !!method;

  const [code, setCode] = useState(method?.code || '');
  const [name, setName] = useState(method?.name || '');
  const [description, setDescription] = useState(method?.description || '');
  const [type, setType] = useState<ShippingMethodType>(
    method?.type || SHIPPING_METHOD_TYPE.STANDARD
  );
  // Display fee in standard PKR (e.g. 250 PKR = 25000 minor units)
  const [baseFeePkr, setBaseFeePkr] = useState<string>(
    method ? (method.baseFee / 100).toString() : '250'
  );
  const [freeAboveSubtotalPkr, setFreeAboveSubtotalPkr] = useState<string>(
    method?.freeAboveSubtotal ? (method.freeAboveSubtotal / 100).toString() : ''
  );
  const [estimatedMinDays, setEstimatedMinDays] = useState<number>(
    method?.estimatedMinDays ?? 3
  );
  const [estimatedMaxDays, setEstimatedMaxDays] = useState<number>(
    method?.estimatedMaxDays ?? 5
  );
  const [active, setActive] = useState<boolean>(method?.active ?? true);
  const [sortOrder, setSortOrder] = useState<number>(method?.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const feeNum = parseFloat(baseFeePkr);
    if (isNaN(feeNum) || feeNum < 0) {
      setError('Base fee must be a valid positive amount.');
      return;
    }

    if (estimatedMinDays < 0 || estimatedMaxDays < estimatedMinDays) {
      setError('Estimated max days must be greater than or equal to min days.');
      return;
    }

    const freeSubtotalNum = freeAboveSubtotalPkr.trim()
      ? parseFloat(freeAboveSubtotalPkr)
      : null;

    const payload: CreateShippingMethodInput = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || null,
      type,
      baseFee: Math.round(feeNum * 100), // convert to minor units
      freeAboveSubtotal: freeSubtotalNum !== null ? Math.round(freeSubtotalNum * 100) : null,
      currency: 'PKR',
      estimatedMinDays,
      estimatedMaxDays,
      active,
      sortOrder,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to save shipping method.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
              {isEditing ? `Edit Shipping Method` : `New Shipping Method`}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure rates, delivery estimates, and free shipping thresholds
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Method Code *
              </label>
              <input
                type="text"
                placeholder="e.g. STD-DELIVERY"
                value={code}
                disabled={isEditing}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Method Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ShippingMethodType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              >
                {Object.values(SHIPPING_METHOD_TYPE).map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Display Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Standard Overland Delivery"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Reliable overland delivery to all major cities across Pakistan."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Base Fee (PKR) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="250"
                value={baseFeePkr}
                onChange={(e) => setBaseFeePkr(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Free Above Subtotal (PKR)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 5000 (Optional)"
                value={freeAboveSubtotalPkr}
                onChange={(e) => setFreeAboveSubtotalPkr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Est. Min Days *
              </label>
              <input
                type="number"
                min="0"
                value={estimatedMinDays}
                onChange={(e) => setEstimatedMinDays(parseInt(e.target.value) || 0)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Est. Max Days *
              </label>
              <input
                type="number"
                min="0"
                value={estimatedMaxDays}
                onChange={(e) => setEstimatedMaxDays(parseInt(e.target.value) || 0)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Sort / Display Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="method-active-toggle"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
              />
              <label
                htmlFor="method-active-toggle"
                className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Active (Available for checkout)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 sticky bottom-0 bg-white dark:bg-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Method'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
