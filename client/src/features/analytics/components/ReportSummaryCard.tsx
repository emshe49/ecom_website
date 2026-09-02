import React from 'react';
import { MetricComparison } from '../types/analytics.types';

interface ReportSummaryCardProps {
  title: string;
  comparison?: MetricComparison;
  value?: string | number;
  format?: 'currency' | 'number' | 'percentage' | 'hours';
  subtitle?: string;
  icon?: React.ReactNode;
}

export const ReportSummaryCard: React.FC<ReportSummaryCardProps> = ({
  title,
  comparison,
  value,
  format = 'number',
  subtitle,
  icon,
}) => {
  const rawValue = comparison !== undefined ? comparison.current : value;

  const formatDisplay = (val: any) => {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'number') {
      if (format === 'currency') {
        return `$${(val / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (format === 'percentage') {
        return `${val.toFixed(1)}%`;
      }
      if (format === 'hours') {
        return `${val} hrs`;
      }
      return val.toLocaleString();
    }
    return String(val);
  };

  const changePct = comparison?.changePercentage;
  const isPositive = (changePct || 0) > 0;
  const isNeutral = (changePct || 0) === 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all shadow-lg backdrop-blur-sm flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="text-2xl md:text-3xl font-extrabold text-white mt-1.5 tracking-tight font-mono">
            {formatDisplay(rawValue)}
          </div>
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        {comparison !== undefined ? (
          <>
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  isNeutral
                    ? 'bg-slate-800 text-slate-300'
                    : isPositive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {!isNeutral && (isPositive ? '↑' : '↓')} {Math.abs(changePct || 0)}%
              </span>
              <span className="text-[11px] text-slate-400">vs prev period</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Prev: {formatDisplay(comparison.previous)}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-slate-400">{subtitle || 'Historical metric'}</span>
        )}
      </div>
    </div>
  );
};
