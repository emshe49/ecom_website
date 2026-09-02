import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { auditApi } from '../api/audit.api';
import {
  AuditLogListItem,
  AuditFilterParams,
  AuditLogListResponse,
} from '../types/audit.types';
import { AuditEventBadge } from '../components/AuditEventBadge';
import { AuditOutcomeBadge } from '../components/AuditOutcomeBadge';
import { AuditActor } from '../components/AuditActor';
import { AuditFilters } from '../components/AuditFilters';
import { usePermission } from '../../auth/hooks/usePermission';

export const AuditLogsPage: React.FC = () => {
  const canExport = usePermission('audit:export');

  const [data, setData] = useState<AuditLogListResponse>({
    items: [],
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [filters, setFilters] = useState<AuditFilterParams>({
    page: 1,
    limit: 50,
    sort: 'createdAt',
    order: 'desc',
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await auditApi.listAuditLogs(filters);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 50,
      sort: 'createdAt',
      order: 'desc',
    });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await auditApi.exportAuditLogs(filters);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to export audit logs.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= data.totalPages) {
      setFilters((prev) => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </span>
            <span>Audit Logs & Security Activity</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable, append-only security audit trail with cryptographic tamper-evidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Append-Only Active
          </span>
        </div>
      </div>

      {/* Filter Component */}
      <AuditFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        onExport={handleExport}
        canExport={canExport}
        isExporting={isExporting}
      />

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchLogs()}
            className="underline text-xs font-semibold hover:text-rose-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Request / IP</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2 text-sm">
                      <svg className="animate-spin w-4 h-4 text-indigo-400" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Loading audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm italic">
                    No audit records match the selected query criteria.
                  </td>
                </tr>
              ) : (
                data.items.map((log: AuditLogListItem) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <AuditEventBadge category={log.category} eventType={log.eventType} />
                    </td>
                    <td className="py-3 px-4">
                      <AuditActor
                        actorType={log.actorType}
                        displayName={log.actorDisplayName}
                        roleSnapshot={log.actorRoleSnapshot}
                      />
                    </td>
                    <td className="py-3 px-4">
                      {log.targetDisplay ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200 truncate max-w-[160px]">
                            {log.targetDisplay}
                          </span>
                          {log.targetType && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {log.targetType}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <AuditOutcomeBadge outcome={log.outcome} />
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      <div>{log.ipAddress || '—'}</div>
                      {log.requestId && (
                        <div
                          className="text-[10px] text-slate-500 truncate max-w-[120px]"
                          title={log.requestId}
                        >
                          {log.requestId}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/admin/audit/${log.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20"
                      >
                        <span>Details</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <span className="text-slate-200 font-semibold">{data.items.length}</span> of{' '}
            <span className="text-slate-200 font-semibold">{data.total}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={data.page <= 1 || loading}
              onClick={() => handlePageChange(data.page - 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-slate-300">
              {data.page} / {data.totalPages || 1}
            </span>
            <button
              type="button"
              disabled={data.page >= data.totalPages || loading}
              onClick={() => handlePageChange(data.page + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
