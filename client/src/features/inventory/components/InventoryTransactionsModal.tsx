import React, { useEffect, useState } from 'react';
import {
  InventoryItem,
  InventoryTransaction,
} from '../types/inventory.types';
import { inventoryApi } from '../api/inventory.api';


interface InventoryTransactionsModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryTransactionsModal: React.FC<
  InventoryTransactionsModalProps
> = ({ item, isOpen, onClose }) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [typeFilter, setTypeFilter] = useState<string>('');

  useEffect(() => {
    if (isOpen && item) {
      loadTransactions(1, typeFilter);
    }
  }, [isOpen, item, typeFilter]);

  const loadTransactions = async (pageNum: number, type?: string) => {
    if (!item) return;
    setIsLoading(true);
    try {
      const res = await inventoryApi.getVariantTransactions(item.variantId, {
        page: pageNum,
        limit: 10,
        ...(type ? { type } : {}),
      });
      setTransactions(res.transactions);
      setPage(res.pagination.currentPage);
      setTotalPages(res.pagination.totalPages);
    } catch {
      // Handled silently with empty/error view
    } finally {
      setIsLoading(false);
    }
  };


  if (!isOpen || !item) return null;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'STOCK_IN':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            STOCK IN
          </span>
        );
      case 'STOCK_OUT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            STOCK OUT
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            ADJUSTMENT
          </span>
        );
      case 'RESERVATION':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            RESERVATION
          </span>
        );
      case 'RELEASE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
            RELEASE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold">Stock Transaction Audit Trail</h3>
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

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Filter Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">All Types</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="RESERVATION">Reservation</option>
              <option value="RELEASE">Release</option>
            </select>
          </div>
          <span className="text-slate-500 font-medium">
            Current: <strong>{item.onHand}</strong> on-hand ({item.available} available)
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <svg className="animate-spin h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs font-medium">Loading audit trail...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No inventory transactions recorded for this variant yet.
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(tx.type)}
                    <span className="text-xs font-semibold text-slate-800">
                      {tx.type === 'STOCK_IN' && `+${tx.quantity} units`}
                      {tx.type === 'STOCK_OUT' && `-${tx.quantity} units`}
                      {tx.type === 'ADJUSTMENT' && `Recount: ${tx.previousOnHand} → ${tx.newOnHand}`}
                      {tx.type === 'RESERVATION' && `Reserved +${tx.quantity}`}
                      {tx.type === 'RELEASE' && `Released -${tx.quantity}`}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(tx.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Diff summary */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">On Hand:</span>{' '}
                    <span className="font-semibold text-slate-700 font-mono">
                      {tx.previousOnHand} → {tx.newOnHand}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Reserved:</span>{' '}
                    <span className="font-semibold text-slate-700 font-mono">
                      {tx.previousReserved} → {tx.newReserved}
                    </span>
                  </div>
                </div>

                {/* Reason & Performer */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <p className="italic text-slate-600">"{tx.reason}"</p>
                  {tx.createdBy && (
                    <span className="text-[11px] text-slate-400">
                      by <strong>{tx.createdBy.name}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
            <button
              onClick={() => loadTransactions(page - 1, typeFilter)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-medium text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => loadTransactions(page + 1, typeFilter)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
