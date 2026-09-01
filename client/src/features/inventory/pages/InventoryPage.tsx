import React, { useState, useEffect, useCallback } from 'react';
import {
  InventoryItem,
  StockStatus,
  InventoryPagination,
  InventorySortBy,
} from '../types/inventory.types';

import { inventoryApi } from '../api/inventory.api';
import { InventoryTable } from '../components/InventoryTable';
import { AdjustStockModal } from '../components/AdjustStockModal';
import { ThresholdModal } from '../components/ThresholdModal';
import { InventoryTransactionsModal } from '../components/InventoryTransactionsModal';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState<InventoryPagination>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter and Sorting state
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | ''>('');
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryItem | null>(null);
  const [thresholdModalItem, setThresholdModalItem] = useState<InventoryItem | null>(null);
  const [historyModalItem, setHistoryModalItem] = useState<InventoryItem | null>(null);

  const fetchInventory = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await inventoryApi.getInventoryList({
          page,
          limit: 20,
          search: search.trim() || undefined,
          status: (statusFilter as StockStatus) || undefined,
          sortBy: sortBy as InventorySortBy,
          sortOrder,
        });
        setItems(res.items);
        setPagination(res.pagination);
      } catch {
        setErrorMessage('Failed to load inventory. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, sortBy, sortOrder]
  );



  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchInventory(1);
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [fetchInventory]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleItemUpdated = (updated: InventoryItem) => {
    setItems((prev) =>
      prev.map((item) => (item.variantId === updated.variantId ? updated : item))
    );
  };

  // Quick stat calculations for current view
  const inStockCount = items.filter((i) => i.status === 'IN_STOCK' || i.stockStatus === 'IN_STOCK').length;
  const lowStockCount = items.filter((i) => i.status === 'LOW_STOCK' || i.stockStatus === 'LOW_STOCK').length;
  const outOfStockCount = items.filter((i) => i.status === 'OUT_OF_STOCK' || i.stockStatus === 'OUT_OF_STOCK').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Inventory & Stock Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time on-hand, reserved, and available stock levels across all sellable Product Variants.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchInventory(pagination.currentPage)}
            className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Summary Cards */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('')}
          className={`p-5 bg-white rounded-2xl border transition cursor-pointer shadow-sm hover:shadow-md ${
            statusFilter === '' ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total SKUs</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{pagination.totalItems}</p>
          <span className="text-xs text-slate-400">All registered variants</span>
        </div>

        <div
          onClick={() => setStatusFilter('IN_STOCK')}
          className={`p-5 bg-white rounded-2xl border transition cursor-pointer shadow-sm hover:shadow-md ${
            statusFilter === 'IN_STOCK' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">In Stock</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{inStockCount}</p>
          <span className="text-xs text-slate-400">Optimal availability</span>
        </div>

        <div
          onClick={() => setStatusFilter('LOW_STOCK')}
          className={`p-5 bg-white rounded-2xl border transition cursor-pointer shadow-sm hover:shadow-md ${
            statusFilter === 'LOW_STOCK' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Low Stock</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{lowStockCount}</p>
          <span className="text-xs text-slate-400">Under threshold level</span>
        </div>

        <div
          onClick={() => setStatusFilter('OUT_OF_STOCK')}
          className={`p-5 bg-white rounded-2xl border transition cursor-pointer shadow-sm hover:shadow-md ${
            statusFilter === 'OUT_OF_STOCK' ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Out of Stock</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{outOfStockCount}</p>
          <span className="text-xs text-slate-400">0 available stock</span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or product name..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 font-medium"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-600 self-stretch sm:self-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === '' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('IN_STOCK')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'IN_STOCK' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            In Stock
          </button>
          <button
            onClick={() => setStatusFilter('LOW_STOCK')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'LOW_STOCK' ? 'bg-amber-500 text-white shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setStatusFilter('OUT_OF_STOCK')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'OUT_OF_STOCK' ? 'bg-rose-600 text-white shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Main Inventory Table */}
      <InventoryTable
        items={items}
        isLoading={isLoading}
        onAdjustStock={(item) => setAdjustModalItem(item)}
        onUpdateThreshold={(item) => setThresholdModalItem(item)}
        onViewTransactions={(item) => setHistoryModalItem(item)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200/80 shadow-sm text-xs font-medium text-slate-600">
          <div>
            Showing <strong>{(pagination.currentPage - 1) * pagination.limit + 1}</strong> to{' '}
            <strong>{Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)}</strong> of{' '}
            <strong>{pagination.totalItems}</strong> items
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchInventory(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white font-semibold transition"
            >
              Previous
            </button>
            <span className="font-bold text-slate-800">
              {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchInventory(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white font-semibold transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AdjustStockModal
        item={adjustModalItem}
        isOpen={!!adjustModalItem}
        onClose={() => setAdjustModalItem(null)}
        onSuccess={handleItemUpdated}
      />

      <ThresholdModal
        item={thresholdModalItem}
        isOpen={!!thresholdModalItem}
        onClose={() => setThresholdModalItem(null)}
        onSuccess={handleItemUpdated}
      />

      <InventoryTransactionsModal
        item={historyModalItem}
        isOpen={!!historyModalItem}
        onClose={() => setHistoryModalItem(null)}
      />
    </div>
  );
};
