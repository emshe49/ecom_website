import React from 'react';
import { RatingDistributionPoint } from '../types/analytics.types';

interface RatingDistributionProps {
  distribution: RatingDistributionPoint[];
  averageRating: number;
  totalReviews: number;
}

export const RatingDistribution: React.FC<RatingDistributionProps> = ({
  distribution,
  averageRating,
  totalReviews,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <h3 className="text-base font-bold text-white mb-1">Customer Rating Distribution</h3>
      <p className="text-xs text-slate-400 mb-6">
        Aggregated verified customer sentiment breakdown
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Rating Score */}
        <div className="text-center p-5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <div className="text-5xl font-black text-amber-400 font-mono tracking-tight">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 my-2 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-lg">
                {star <= Math.round(averageRating) ? '★' : '☆'}
              </span>
            ))}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Based on <span className="text-white font-bold">{totalReviews}</span> verified reviews
          </div>
        </div>

        {/* 5-Star Bars */}
        <div className="md:col-span-2 space-y-2.5">
          {distribution.map((item) => (
            <div key={item.rating} className="flex items-center gap-3 text-xs">
              <span className="w-12 font-bold text-slate-400 font-mono shrink-0">
                {item.rating} Star
              </span>
              <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
              <span className="w-10 text-right font-mono text-slate-300 shrink-0 font-semibold">
                {item.percentage}%
              </span>
              <span className="w-12 text-right font-mono text-slate-400 shrink-0">
                ({item.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
