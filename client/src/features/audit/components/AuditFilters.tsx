import React from 'react';
import { AuditFilterParams, AuditCategory, ActorType, AuditOutcome } from '../types/audit.types';

interface AuditFiltersProps {
  filters: AuditFilterParams;
  onChange: (filters: AuditFilterParams) => void;
  onReset: () => void;
  onExport?: () => void;
  canExport?: boolean;
  isExporting?: boolean;
}

const CATEGORIES: AuditCategory[] = [
  'AUTH',
  'USER',
  'RBAC',
  'CATALOG',
  'INVENTORY',
  'ORDER',
  'PAYMENT',
  'REFUND',
  'SHIPPING',
  'PROMOTION',
  'REVIEW',
  'SUPPORT',
  'SECURITY',
  'SYSTEM',
];

const ACTOR_TYPES: ActorType[] = [
  'USER',
  'ADMIN',
  'SUPER_ADMIN',
  'SYSTEM',
  'CRON',
  'WEBHOOK',
  'ANONYMOUS',
];

const OUTCOMES: AuditOutcome[] = ['SUCCESS', 'FAILURE', 'DENIED'];

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  filters,
  onChange,
  onReset,
  onExport,
  canExport = false,
  isExporting = false,
}) => {
  const handleChange = (key: keyof AuditFilterParams, value: any) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Search action, target, actor..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => handleChange('search', '')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
          <select
            value={filters.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Actor Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Actor Type</label>
          <select
            value={filters.actorType || ''}
            onChange={(e) => handleChange('actorType', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Actor Types</option>
            {ACTOR_TYPES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Outcome</label>
          <select
            value={filters.outcome || ''}
            onChange={(e) => handleChange('outcome', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Outcomes</option>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">From:</span>
            <input
              type="datetime-local"
              value={filters.from ? filters.from.slice(0, 16) : ''}
              onChange={(e) =>
                handleChange('from', e.target.value ? new Date(e.target.value).toISOString() : '')
              }
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">To:</span>
            <input
              type="datetime-local"
              value={filters.to ? filters.to.slice(0, 16) : ''}
              onChange={(e) =>
                handleChange('to', e.target.value ? new Date(e.target.value).toISOString() : '')
              }
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Reset Filters
          </button>

          {canExport && onExport && (
            <button
              type="button"
              onClick={onExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-sm transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
