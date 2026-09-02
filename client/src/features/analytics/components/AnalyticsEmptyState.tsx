import React from 'react';

interface AnalyticsEmptyStateProps {
  title?: string;
  message?: string;
}

export const AnalyticsEmptyState: React.FC<AnalyticsEmptyStateProps> = ({
  title = 'No analytics records found',
  message = 'There is no historical activity matching your current date range and filter criteria.',
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center shadow-xl backdrop-blur-md">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl mb-4">
        📊
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">{message}</p>
    </div>
  );
};
