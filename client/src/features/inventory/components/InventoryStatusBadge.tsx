import React from 'react';
import { StockStatus } from '../types/inventory.types';

interface InventoryStatusBadgeProps {
  status: StockStatus;
  available?: number;
  threshold?: number;
  showCount?: boolean;
}

export const InventoryStatusBadge: React.FC<InventoryStatusBadgeProps> = ({
  status,
  available,
  showCount = false,
}) => {
  switch (status) {
    case 'IN_STOCK':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          In Stock {showCount && available !== undefined ? `(${available})` : ''}
        </span>
      );
    case 'LOW_STOCK':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Low Stock {showCount && available !== undefined ? `(${available})` : ''}
        </span>
      );
    case 'OUT_OF_STOCK':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Out of Stock
        </span>
      );
  }
};
