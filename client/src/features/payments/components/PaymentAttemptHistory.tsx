import React from 'react';
import { PaymentAttemptDTO } from '../payments.types';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { Clock, AlertCircle } from 'lucide-react';

interface PaymentAttemptHistoryProps {
  attempts: PaymentAttemptDTO[];
}

export const PaymentAttemptHistory: React.FC<PaymentAttemptHistoryProps> = ({
  attempts,
}) => {
  if (!attempts || attempts.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        No payment attempts recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          Payment Attempts History ({attempts.length})
        </h4>
      </div>

      <div className="space-y-2">
        {attempts.map((att) => {
          const isSuccess = att.status === 'SUCCEEDED';
          const isFailed = att.status === 'FAILED';

          return (
            <div
              key={att.id || att.attemptNumber}
              className={`p-3.5 rounded-lg border text-sm transition-colors ${
                isSuccess
                  ? 'border-emerald-500/30 bg-emerald-950/20'
                  : isFailed
                  ? 'border-rose-500/20 bg-rose-950/20'
                  : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">
                    Attempt #{att.attemptNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({att.provider} • {att.method})
                  </span>
                </div>
                <PaymentStatusBadge status={att.status} size="sm" />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Initiated: {new Date(att.initiatedAt).toLocaleString()}
                </span>
                {att.completedAt && (
                  <span>
                    Completed: {new Date(att.completedAt).toLocaleString()}
                  </span>
                )}
              </div>

              {att.failureMessage && (
                <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-medium">
                      {att.failureCode ? `[${att.failureCode}] ` : ''}
                    </span>
                    {att.failureMessage}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
