import React, { useState, useEffect } from 'react';
import { reviewsApi } from '../api/reviews.api';
import {
  PublicReviewDTO,
  ProductRatingSummaryDTO,
  ReviewSortType,
} from '../types/review.types';
import { RatingSummary } from './RatingSummary';
import { RatingDistribution } from './RatingDistribution';
import { ReviewCard } from './ReviewCard';
import { ReviewModal } from './ReviewModal';
import { useAuthStore } from '../../auth/store/auth.store';
import { MessageSquarePlus, Loader2, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  primaryImage?: string | null;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  productId,
  productName,
  primaryImage,
}) => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<PublicReviewDTO[]>([]);
  const [ratingSummary, setRatingSummary] = useState<ProductRatingSummaryDTO>({
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);
  const [sortOption, setSortOption] = useState<ReviewSortType>('newest');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Review Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reviewsApi.getProductReviews(productId, {
        page,
        limit: 5,
        rating: selectedRating,
        sort: sortOption,
      });

      setReviews(res.reviews);
      setRatingSummary(res.ratingSummary);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load product reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, page, selectedRating, sortOption]);

  const handleWriteReviewClick = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <section className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800" id="customer-reviews">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Customer Reviews & Ratings
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real feedback from verified purchasers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleWriteReviewClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Ratings Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-1">
          <RatingSummary summary={ratingSummary} />
        </div>
        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Rating Breakdown
          </h3>
          <RatingDistribution
            summary={ratingSummary}
            selectedRating={selectedRating}
            onSelectRating={(r) => {
              setSelectedRating(r);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
        {/* Star Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedRating(undefined);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRating === undefined
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Reviews ({ratingSummary.count})
          </button>
          {[5, 4, 3, 2, 1].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setSelectedRating(selectedRating === st ? undefined : st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedRating === st
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st} Star ({ratingSummary.distribution[st as keyof typeof ratingSummary.distribution] || 0})
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <label htmlFor="review-sort" className="text-xs font-semibold text-slate-500">
            Sort by:
          </label>
          <select
            id="review-sort"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value as ReviewSortType);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="newest">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating-high">Highest Rating</option>
            <option value="rating-low">Lowest Rating</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-amber-500" />
          <p className="text-sm">Loading reviews...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 text-sm">
          {error}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            No reviews match your selected filter
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Be the first verified customer to leave a review for this product!
          </p>
          <button
            type="button"
            onClick={handleWriteReviewClick}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            Write a Review
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <ReviewCard key={rev.id} review={rev} />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-6 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={{ productId, productName, primaryImage }}
        onSuccess={() => {
          fetchReviews();
        }}
      />
    </section>
  );
};
