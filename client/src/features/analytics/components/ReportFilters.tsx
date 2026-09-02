import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnalyticsFilterParams, AnalyticsGroupBy } from '../types/analytics.types';

interface ReportFiltersProps {
  onFilterChange: (params: AnalyticsFilterParams) => void;
  onExportCsv?: () => void;
  isExporting?: boolean;
  showGroupBy?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  extraFilters?: React.ReactNode;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  onFilterChange,
  onExportCsv,
  isExporting = false,
  showGroupBy = true,
  showSearch = false,
  searchPlaceholder = 'Search...',
  extraFilters,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [preset, setPreset] = useState<string>('last30');
  const [from, setFrom] = useState<string>(searchParams.get('from') || '');
  const [to, setTo] = useState<string>(searchParams.get('to') || '');
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>(
    (searchParams.get('groupBy') as AnalyticsGroupBy) || 'day'
  );
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');

  // Calculate preset dates
  const handlePresetSelect = (selectedPreset: string) => {
    setPreset(selectedPreset);
    const now = new Date();
    let newFrom = new Date();
    const newTo = new Date(now);

    switch (selectedPreset) {
      case 'today':
        newFrom.setHours(0, 0, 0, 0);
        break;
      case 'last7':
        newFrom.setDate(now.getDate() - 7);
        break;
      case 'last30':
        newFrom.setDate(now.getDate() - 30);
        break;
      case 'last90':
        newFrom.setDate(now.getDate() - 90);
        break;
      case 'thisMonth':
        newFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        newFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        newTo.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime());
        break;
      case 'thisYear':
        newFrom = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    const fromIso = newFrom.toISOString();
    const toIso = newTo.toISOString();
    setFrom(fromIso);
    setTo(toIso);

    triggerFilterUpdate({ from: fromIso, to: toIso, groupBy, search });
  };

  const triggerFilterUpdate = (params: AnalyticsFilterParams) => {
    // Update URL Search Params
    const updated = new URLSearchParams(searchParams);
    if (params.from) updated.set('from', params.from);
    else updated.delete('from');

    if (params.to) updated.set('to', params.to);
    else updated.delete('to');

    if (params.groupBy) updated.set('groupBy', params.groupBy);
    if (params.search) updated.set('search', params.search);
    else updated.delete('search');

    setSearchParams(updated, { replace: true });
    onFilterChange(params);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    triggerFilterUpdate({ from, to, groupBy, search });
  };

  const handleReset = () => {
    setPreset('last30');
    setFrom('');
    setTo('');
    setGroupBy('day');
    setSearch('');
    setSearchParams(new URLSearchParams(), { replace: true });
    onFilterChange({});
  };

  useEffect(() => {
    // Sync initial state from URL
    const urlFrom = searchParams.get('from');
    const urlTo = searchParams.get('to');
    const urlGroup = searchParams.get('groupBy') as AnalyticsGroupBy;
    const urlSearch = searchParams.get('search');

    if (urlFrom) setFrom(urlFrom);
    if (urlTo) setTo(urlTo);
    if (urlGroup) setGroupBy(urlGroup);
    if (urlSearch) setSearch(urlSearch);
  }, []);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl backdrop-blur-md">
      {/* Presets Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">
            Presets:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'last7', label: '7 Days' },
            { id: 'last30', label: '30 Days' },
            { id: 'last90', label: '90 Days' },
            { id: 'thisMonth', label: 'This Month' },
            { id: 'lastMonth', label: 'Last Month' },
            { id: 'thisYear', label: 'This Year' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetSelect(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                preset === p.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 shadow-sm transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>

      {/* Inputs Form Row */}
      <form onSubmit={handleApply} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 items-end">
        {showSearch && (
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            From (Date)
          </label>
          <input
            type="date"
            value={from ? from.split('T')[0] : ''}
            onChange={(e) => {
              setPreset('custom');
              setFrom(e.target.value ? new Date(e.target.value).toISOString() : '');
            }}
            className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            To (Date)
          </label>
          <input
            type="date"
            value={to ? to.split('T')[0] : ''}
            onChange={(e) => {
              setPreset('custom');
              setTo(e.target.value ? new Date(e.target.value).toISOString() : '');
            }}
            className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {showGroupBy && (
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Grouping
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as AnalyticsGroupBy)}
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="day">By Day</option>
              <option value="week">By Week</option>
              <option value="month">By Month</option>
              <option value="year">By Year</option>
            </select>
          </div>
        )}

        {extraFilters}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all"
            title="Reset Filters"
          >
            ↺
          </button>
        </div>
      </form>
    </div>
  );
};
