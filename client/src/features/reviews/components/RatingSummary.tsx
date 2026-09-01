import React from 'react';
import { RatingStars } from './RatingStars';
import { ProductRatingSummaryDTO } from '../types/review.types';
import { ShieldCheck } from 'lucide-react';

interface RatingSummaryProps {
  summary: ProductRatingSummaryDTO;
  className?: string;
}

export const RatingSummary: React.FC<RatingSummaryProps> = ({ summary, className = '' }) => {
  const { average, count } = summary;

  return (
    <div
      className={`bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          {count > 0 ? average.toFixed(1) : '0.0'}
        </span>
        <span className="text-xl font-medium text-slate-400 dark:text-slate-500">/ 5</span>
      </div>

      <div className="mb-2">
        <RatingStars rating={average} size="lg" />
      </div>

      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
        {count === 0
          ? 'No customer reviews yet'
          : `Based on ${count} verified ${count === 1 ? 'review' : 'reviews'}`}
      </p>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-semibold">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>100% Verified Purchases</span>
      </div>
    </div>
  );
};
