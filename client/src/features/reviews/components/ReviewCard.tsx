import React from 'react';
import { RatingStars } from './RatingStars';
import { HelpfulButton } from './HelpfulButton';
import { PublicReviewDTO, CustomerReviewDTO } from '../types/review.types';
import { ShieldCheck, Calendar, Tag, Edit3, Trash2 } from 'lucide-react';
import { ReviewStatusBadge } from './ReviewStatusBadge';

interface ReviewCardProps {
  review: PublicReviewDTO | CustomerReviewDTO;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  isOwner = false,
  onEdit,
  onDelete,
  className = '',
}) => {
  const isCustomerReview = 'status' in review;
  const displayName = isCustomerReview
    ? 'You'
    : (review as PublicReviewDTO).reviewer?.displayName || 'Verified Customer';

  const formattedDate = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <article
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-shadow hover:shadow-md ${className}`}
    >
      {/* Header: Reviewer, Rating & Date */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-white text-base">
              {displayName}
            </span>

            {review.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Purchase</span>
              </span>
            )}

            {isCustomerReview && (
              <ReviewStatusBadge status={(review as CustomerReviewDTO).status} />
            )}
          </div>

          <div className="flex items-center gap-2">
            <RatingStars rating={review.rating} size="sm" />
            {review.title && (
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {review.title}
              </h4>
            )}
          </div>
        </div>

        {/* Date and Owner Actions */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Edit Review"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                  title="Delete Review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Variant purchased info */}
      {review.variantSummary && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
            <Tag className="w-3 h-3" />
            <span>Variation: {review.variantSummary.name}</span>
          </span>
        </div>
      )}

      {/* Plain-text review body */}
      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed mb-4">
        {review.body}
      </p>

      {/* Moderation rejection / hidden notice for customer */}
      {isCustomerReview && (review as CustomerReviewDTO).moderationReason && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Staff Moderation Note: </span>
          {(review as CustomerReviewDTO).moderationReason}
        </div>
      )}

      {/* Footer: Helpful Button (Public views) */}
      {!isCustomerReview && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <HelpfulButton
            reviewId={review.id}
            initialCount={review.helpfulCount}
            initialIsHelpful={(review as PublicReviewDTO).isHelpfulByUser}
          />
        </div>
      )}
    </article>
  );
};
