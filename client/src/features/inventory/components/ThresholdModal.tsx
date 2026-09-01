import React, { useState } from 'react';
import { InventoryItem, UpdateThresholdPayload } from '../types/inventory.types';
import { inventoryApi } from '../api/inventory.api';
interface ThresholdModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: InventoryItem) => void;
}

export const ThresholdModal: React.FC<ThresholdModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [threshold, setThreshold] = useState<number>(
    item?.lowStockThreshold ?? 5
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (threshold < 0) {
      setErrorMessage('Low stock threshold cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateThresholdPayload = {
        lowStockThreshold: Number(threshold),
      };
      const result = await inventoryApi.updateThreshold(
        item.variantId,
        payload
      );
      onSuccess(result.inventory);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } } };
      const msg =
        errObj.response?.data?.error?.message ||
        'Failed to update threshold. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }

  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Set Low-Stock Alert Threshold</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {item.productName} • SKU: <span className="font-mono">{item.sku}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-700/50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-800 flex items-start gap-3">

            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>
              When available inventory drops to or below this threshold, the variant status transitions to <strong>LOW_STOCK</strong> and triggers alert badges across admin and storefront.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Low Stock Threshold (Units)
            </label>
            <input
              type="number"
              min={0}
              max={10000}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value) || 0))}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 text-lg"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Current Available Stock: <strong>{item.available} units</strong>
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Update Threshold</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
