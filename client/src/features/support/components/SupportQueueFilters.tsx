import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import {
  SupportQueueFilters,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types/support.types';

export const SupportQueueFilterBar: React.FC<{
  filters: SupportQueueFilters;
  onChange: (newFilters: SupportQueueFilters) => void;
  onReset: () => void;
}> = ({ filters, onChange, onReset }) => {
  return (
    <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
            placeholder="Search tickets by number, subject, or order..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={filters.status || ''}
          onChange={(e) =>
            onChange({
              ...filters,
              status: (e.target.value as TicketStatus) || undefined,
              page: 1,
            })
          }
          className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_CUSTOMER">Waiting on Customer</option>
          <option value="WAITING_FOR_SUPPORT">Waiting on Support</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        {/* Priority filter */}
        <select
          value={filters.priority || ''}
          onChange={(e) =>
            onChange({
              ...filters,
              priority: (e.target.value as TicketPriority) || undefined,
              page: 1,
            })
          }
          className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        {/* Category filter */}
        <select
          value={filters.category || ''}
          onChange={(e) =>
            onChange({
              ...filters,
              category: (e.target.value as TicketCategory) || undefined,
              page: 1,
            })
          }
          className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          <option value="ORDER">Order</option>
          <option value="PAYMENT">Payment</option>
          <option value="SHIPPING">Shipping</option>
          <option value="RETURN">Return</option>
          <option value="REFUND">Refund</option>
          <option value="PRODUCT">Product</option>
          <option value="ACCOUNT">Account</option>
          <option value="PROMOTION">Promotion</option>
          <option value="TECHNICAL">Technical</option>
          <option value="OTHER">Other</option>
        </select>

        {/* Unassigned toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none px-2 py-1.5 rounded-lg border border-slate-800 bg-slate-950">
          <input
            type="checkbox"
            checked={Boolean(filters.unassigned)}
            onChange={(e) =>
              onChange({
                ...filters,
                unassigned: e.target.checked ? true : undefined,
                assignedTo: undefined,
                page: 1,
              })
            }
            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
          />
          <span>Unassigned Only</span>
        </label>

        {/* Reset button */}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
