import React from 'react';
import { AuditOutcome } from '../types/audit.types';

interface AuditOutcomeBadgeProps {
  outcome: AuditOutcome;
  failureCode?: string | null;
}

export const AuditOutcomeBadge: React.FC<AuditOutcomeBadgeProps> = ({ outcome, failureCode }) => {
  if (outcome === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span>SUCCESS</span>
      </span>
    );
  }

  if (outcome === 'DENIED') {
    return (
      <div className="inline-flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>DENIED</span>
        </span>
        {failureCode && (
          <span className="text-[10px] font-mono text-amber-400/80">{failureCode}</span>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>FAILURE</span>
      </span>
      {failureCode && (
        <span className="text-[10px] font-mono text-rose-400/80">{failureCode}</span>
      )}
    </div>
  );
};
