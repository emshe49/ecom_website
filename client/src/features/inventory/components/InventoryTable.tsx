import React from 'react';
import { InventoryItem } from '../types/inventory.types';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { usePermission } from '../../auth/hooks/usePermission';

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading: boolean;
  onAdjustStock: (item: InventoryItem) => void;
  onUpdateThreshold: (item: InventoryItem) => void;
  onViewTransactions: (item: InventoryItem) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  isLoading,
  onAdjustStock,
  onUpdateThreshold,
  onViewTransactions,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const canAdjust = usePermission('inventory:adjust');
  const canUpdate = usePermission('inventory:update') || canAdjust;

  const renderSortHeader = (label: string, field: string) => {
    const isCurrent = sortBy === field;
    return (
      <th
        onClick={() => onSort(field)}
        className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600 cursor-pointer hover:text-slate-900 transition select-none"
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400">
            {isCurrent ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
        <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-sm font-semibold text-slate-500">Loading inventory catalog...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-16 text-center space-y-3">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800">No Inventory Items Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No product variants matched your search or filters. Try adjusting your query or reset the filter status.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
              {renderSortHeader('Product & SKU', 'sku')}
              <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Attributes
              </th>
              {renderSortHeader('On Hand', 'onHand')}
              {renderSortHeader('Reserved', 'reserved')}
              {renderSortHeader('Available', 'available')}
              <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Threshold
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Status
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/60 transition group">
                {/* Product & SKU */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400 font-bold text-xs">
                        {item.sku.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-slate-900 line-clamp-1">
                        {item.productName}
                      </span>
                      <span className="font-mono text-xs text-indigo-600 font-semibold">
                        {item.sku}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Attributes */}
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {item.variantAttributes && item.variantAttributes.length > 0 ? (
                      item.variantAttributes.map((attr, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                        >
                          <span className="text-slate-400">{attr.name}:</span> {attr.value}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Default</span>
                    )}
                  </div>
                </td>

                {/* On Hand */}
                <td className="px-4 py-3.5 font-bold text-slate-800 font-mono">
                  {item.onHand}
                </td>

                {/* Reserved */}
                <td className="px-4 py-3.5 font-semibold text-slate-500 font-mono">
                  {item.reserved}
                </td>

                {/* Available */}
                <td className="px-4 py-3.5">
                  <span
                    className={`font-extrabold font-mono text-base ${
                      item.available === 0
                        ? 'text-rose-600'
                        : item.available <= item.lowStockThreshold
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {item.available}
                  </span>
                </td>

                {/* Threshold */}
                <td className="px-4 py-3.5 text-xs text-slate-600">
                  <button
                    onClick={() => onUpdateThreshold(item)}
                    disabled={!canUpdate}
                    title="Click to edit alert threshold"
                    className="inline-flex items-center gap-1 font-mono font-semibold px-2 py-1 rounded hover:bg-slate-100 transition text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>{item.lowStockThreshold}</span>
                    {canUpdate && (
                      <svg className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    )}
                  </button>
                </td>

                {/* Stock Status Badge */}
                <td className="px-4 py-3.5">
                  <InventoryStatusBadge status={item.status || item.stockStatus} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                  {canAdjust && (
                    <button
                      onClick={() => onAdjustStock(item)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm shadow-indigo-100"
                    >
                      Adjust Stock
                    </button>
                  )}
                  <button
                    onClick={() => onViewTransactions(item)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    title="View Transaction Audit Trail"
                  >
                    History
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
