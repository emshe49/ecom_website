import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { RatingStars } from './RatingStars';
import { reviewsApi } from '../api/reviews.api';
import { CustomerReviewDTO, EligibleProductToReviewDTO } from '../types/review.types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: EligibleProductToReviewDTO | { productId: string; productName: string; primaryImage?: string | null };
  existingReview?: CustomerReviewDTO | null;
  onSuccess: (review: CustomerReviewDTO) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  product,
  existingReview,
  onSuccess,
}) => {
  const isEditing = !!existingReview;

  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [title, setTitle] = useState<string>(existingReview?.title || '');
  const [body, setBody] = useState<string>(existingReview?.body || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setTitle(existingReview.title || '');
      setBody(existingReview.body);
    } else {
      setRating(5);
      setTitle('');
      setBody('');
    }
    setError(null);
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    if (body.trim().length < 10) {
      setError('Review body must be at least 10 characters.');
      return;
    }

    if (body.trim().length > 2000) {
      setError('Review body cannot exceed 2000 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && existingReview) {
        const updated = await reviewsApi.updateReview(existingReview.id, {
          rating,
          title: title.trim() || null,
          body: body.trim(),
        });
        onSuccess(updated);
      } else if (product) {
        const created = await reviewsApi.createReview({
          productId: product.productId,
          rating,
          title: title.trim() || null,
          body: body.trim(),
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Failed to submit review. Please try again.';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const productName = product?.productName || existingReview?.product?.name || 'Product';
  const productImage = product?.primaryImage || existingReview?.product?.primaryImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            {isEditing ? 'Edit Your Review' : 'Write a Review'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Snapshot */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          {productImage && (
            <img
              src={productImage}
              alt={productName}
              className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
            />
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {productName}
            </h4>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Verified Purchase
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Overall Rating <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <RatingStars
                rating={rating}
                size="xl"
                interactive
                onChange={(newRating) => setRating(newRating)}
              />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {rating === 5 && '5 - Outstanding'}
                {rating === 4 && '4 - Very Good'}
                {rating === 3 && '3 - Average'}
                {rating === 2 && '2 - Disappointing'}
                {rating === 1 && '1 - Terrible'}
              </span>
            </div>
          </div>

          {/* Review Title (Optional) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label
                htmlFor="review-title"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Headline / Title (Optional)
              </label>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {title.length}/120
              </span>
            </div>
            <input
              id="review-title"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's most important to know?"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Review Body */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label
                htmlFor="review-body"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Written Review <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {body.length}/2000 (min 10)
              </span>
            </div>
            <textarea
              id="review-body"
              rows={5}
              maxLength={2000}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What did you like or dislike? How did you use this product?"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Submit Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
