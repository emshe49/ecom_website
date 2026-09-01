import React from 'react';
import { ReviewStatusType } from '../types/review.types';
import { CheckCircle2, EyeOff, XCircle } from 'lucide-react';

interface ReviewStatusBadgeProps {
  status: ReviewStatusType;
  className?: string;
}

export const ReviewStatusBadge: React.FC<ReviewStatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'PUBLISHED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Published</span>
        </span>
      );
    case 'HIDDEN':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 ${className}`}
        >
          <EyeOff className="w-3 h-3" />
          <span>Hidden</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 ${className}`}
        >
          <XCircle className="w-3 h-3" />
          <span>Rejected</span>
        </span>
      );
    default:
      return null;
  }
};
