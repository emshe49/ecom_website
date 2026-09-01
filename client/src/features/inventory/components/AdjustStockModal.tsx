import React, { useState } from 'react';
import { InventoryItem, StockAdjustmentPayload } from '../types/inventory.types';
import { inventoryApi } from '../api/inventory.api';
interface AdjustStockModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: InventoryItem) => void;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>(
    'STOCK_IN'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [newOnHand, setNewOnHand] = useState<number>(item?.onHand ?? 0);
  const [reason, setReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !item) return null;

  // Calculate live preview of resulting stock
  let projectedOnHand = item.onHand;
  if (type === 'STOCK_IN') {
    projectedOnHand = item.onHand + Math.max(0, quantity || 0);
  } else if (type === 'STOCK_OUT') {
    projectedOnHand = Math.max(0, item.onHand - Math.max(0, quantity || 0));
  } else if (type === 'ADJUSTMENT') {
    projectedOnHand = Math.max(0, newOnHand || 0);
  }
  const projectedAvailable = Math.max(0, projectedOnHand - item.reserved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason.trim()) {
      setErrorMessage('Please provide a reason for the adjustment.');
      return;
    }

    if (type === 'STOCK_OUT' && (quantity || 0) > item.available) {
      setErrorMessage(
        `Cannot remove ${quantity} items. Only ${item.available} available in stock.`
      );
      return;
    }

    if (type === 'ADJUSTMENT' && (newOnHand || 0) < item.reserved) {
      setErrorMessage(
        `New on-hand cannot be less than current reserved stock (${item.reserved}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: StockAdjustmentPayload = {
        type,
        reason: reason.trim(),
        ...(type === 'ADJUSTMENT'
          ? { newOnHand: Number(newOnHand) }
          : { quantity: Number(quantity) }),
      };

      const result = await inventoryApi.adjustStock(item.variantId, payload);
      onSuccess(result.inventory);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } } };
      const msg =
        errObj.response?.data?.error?.message ||
        'Failed to adjust stock. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }

  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Adjust Inventory Stock</h3>
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

          {/* Current Stock Metrics */}

          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">On Hand</span>
              <p className="text-lg font-bold text-slate-800">{item.onHand}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reserved</span>
              <p className="text-lg font-bold text-slate-600">{item.reserved}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available</span>
              <p className="text-lg font-bold text-emerald-600">{item.available}</p>
            </div>
          </div>

          {/* Action Type Radio Buttons */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('STOCK_IN')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                  type === 'STOCK_IN'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>+</span> Stock In
              </button>
              <button
                type="button"
                onClick={() => setType('STOCK_OUT')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                  type === 'STOCK_OUT'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>-</span> Stock Out
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('ADJUSTMENT');
                  setNewOnHand(item.onHand);
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                  type === 'ADJUSTMENT'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>=</span> Recount
              </button>
            </div>
          </div>

          {/* Quantity / Count Input */}
          {type === 'ADJUSTMENT' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Total On-Hand Quantity
              </label>
              <input
                type="number"
                min={item.reserved}
                value={newOnHand}
                onChange={(e) => setNewOnHand(Math.max(0, parseInt(e.target.value) || 0))}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Must be at least {item.reserved} (current reserved stock).
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {type === 'STOCK_IN' ? 'Quantity to Add' : 'Quantity to Remove'}
              </label>
              <input
                type="number"
                min={1}
                max={type === 'STOCK_OUT' ? item.available : 100000}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
              />
            </div>
          )}

          {/* Live Projected Stock Outcome */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
            <span>Resulting Available Stock:</span>
            <span className="font-bold text-sm text-indigo-700">
              {projectedOnHand} on-hand ({projectedAvailable} available)
            </span>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason / Reference <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Received shipment #PO-9842, cycle count discrepancy, damaged inventory..."
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 placeholder-slate-400"
            />
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
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
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
                <span>Confirm Adjustment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
