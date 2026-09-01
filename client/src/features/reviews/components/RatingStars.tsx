import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number; // 0 to 5 (e.g., 4.5, 5, 0)
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
  className = '',
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-7 h-7',
  };

  const activeRating = interactive && hoverRating !== null ? hoverRating : rating;

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`${rating} out of ${maxRating} stars`}
    >
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const isFilled = activeRating >= starValue;
        const isHalf = !isFilled && activeRating >= starValue - 0.5;

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(null)}
            className={`transition-transform focus:outline-none ${
              interactive
                ? 'cursor-pointer hover:scale-110 focus-visible:ring-2 focus-visible:ring-amber-400 rounded-sm'
                : 'cursor-default'
            }`}
            aria-label={interactive ? `${starValue} Star${starValue > 1 ? 's' : ''}` : undefined}
          >
            <Star
              className={`${sizeClasses[size]} transition-colors duration-150 ${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : isHalf
                  ? 'fill-amber-200 text-amber-400'
                  : 'fill-slate-100 text-slate-300 dark:fill-slate-800 dark:text-slate-600'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
