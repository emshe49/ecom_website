import React from 'react';
import { Star } from 'lucide-react';
import { ProductRatingSummaryDTO } from '../types/review.types';

interface RatingDistributionProps {
  summary: ProductRatingSummaryDTO;
  selectedRating?: number;
  onSelectRating?: (rating: number | undefined) => void;
  className?: string;
}

export const RatingDistribution: React.FC<RatingDistributionProps> = ({
  summary,
  selectedRating,
  onSelectRating,
  className = '',
}) => {
  const { count: totalCount, distribution } = summary;

  const stars = [5, 4, 3, 2, 1] as const;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {stars.map((star) => {
        const starCount = distribution[star] || 0;
        const percentage = totalCount > 0 ? Math.round((starCount / totalCount) * 100) : 0;
        const isSelected = selectedRating === star;

        return (
          <button
            key={star}
            type="button"
            onClick={() => onSelectRating?.(isSelected ? undefined : star)}
            className={`w-full group flex items-center gap-3 text-sm rounded-lg px-2 py-1 transition-all ${
              isSelected
                ? 'bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-400'
                : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
            }`}
          >
            {/* Star label */}
            <div className="flex items-center gap-1 w-12 text-slate-700 dark:text-slate-300 font-medium text-xs">
              <span>{star}</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>

            {/* Progress Track */}
            <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300 group-hover:bg-amber-500"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Percentage & Count */}
            <div className="w-16 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
              {percentage}% <span className="text-slate-400 dark:text-slate-500">({starCount})</span>
            </div>
          </button>
        );
      })}

      {selectedRating && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => onSelectRating?.(undefined)}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Clear rating filter
          </button>
        </div>
      )}
    </div>
  );
};
