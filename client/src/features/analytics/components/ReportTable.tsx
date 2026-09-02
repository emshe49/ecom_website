import React from 'react';
import { ReportPagination } from '../types/analytics.types';

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface ReportTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  pagination?: ReportPagination;
  onPageChange?: (newPage: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (columnKey: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function ReportTable<T>({
  columns,
  data,
  pagination,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  isLoading = false,
  emptyMessage = 'No report records found.',
}: ReportTableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="h-6 bg-slate-800/80 rounded animate-pulse w-48"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-800/40 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              {columns.map((col) => {
                const isCurrentSort = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-4 py-3.5 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${
                      col.sortable && onSortChange
                        ? 'cursor-pointer select-none hover:text-indigo-400 transition-colors'
                        : ''
                    }`}
                    onClick={() => {
                      if (col.sortable && onSortChange) {
                        onSortChange(col.key);
                      }
                    }}
                  >
                    <div
                      className={`inline-flex items-center gap-1 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && isCurrentSort && (
                        <span className="text-indigo-400 font-black">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.length > 0 ? (
              data.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-slate-800/40 transition-colors font-medium"
                >
                  {columns.map((col) => {
                    const content = col.render
                      ? col.render(row)
                      : col.accessor
                      ? col.accessor(row)
                      : (row as any)[col.key];

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 whitespace-nowrap ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-slate-400 text-xs"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing page <span className="font-bold text-white font-mono">{pagination.page}</span> of{' '}
            <span className="font-bold text-white font-mono">{pagination.totalPages || 1}</span> (
            <span className="font-mono text-slate-300 font-semibold">{pagination.totalItems}</span> total rows)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pagination.hasPrevPage}
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold disabled:opacity-40 disabled:hover:bg-slate-800 transition-all text-xs"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!pagination.hasNextPage}
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold disabled:opacity-40 disabled:hover:bg-slate-800 transition-all text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
