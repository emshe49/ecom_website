import React, { useState, useEffect } from 'react';
import { reviewsApi } from '../api/reviews.api';
import { AdminReviewDTO, ReviewStatusType } from '../types/review.types';
import { RatingStars } from '../components/RatingStars';
import { ReviewStatusBadge } from '../components/ReviewStatusBadge';
import {
  Search,
  Eye,
  CheckCircle,
  EyeOff,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<AdminReviewDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatusType | ''>('');
  const [ratingFilter, setRatingFilter] = useState<number | ''>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Moderation Prompt State
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reviewsApi.getAdminReviews({
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        rating: ratingFilter ? Number(ratingFilter) : undefined,
      });

      setReviews(res.reviews);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page, statusFilter, ratingFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  const handleQuickStatusChange = async (reviewId: string, nextStatus: ReviewStatusType) => {
    let reason: string | null = null;
    if (nextStatus === 'HIDDEN' || nextStatus === 'REJECTED') {
      const promptRes = window.prompt(
        `Enter moderation reason for setting review to ${nextStatus} (minimum 5 characters):`
      );
      if (!promptRes || promptRes.trim().length < 5) {
        alert('A valid reason (minimum 5 characters) is required to hide or reject a review.');
        return;
      }
      reason = promptRes.trim();
    }

    setModeratingId(reviewId);
    try {
      await reviewsApi.moderateReview(reviewId, {
        status: nextStatus,
        reason,
      });
      await fetchReviews();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to update review status.');
    } finally {
      setModeratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Review Moderation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor, filter, and moderate customer ratings and written reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold">
            Total Reviews: {totalCount}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by text, title, or moderation notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ReviewStatusType | '');
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="HIDDEN">Hidden</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Rating filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value ? Number(e.target.value) : '');
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">All Star Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Review Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-amber-500" />
            <p className="text-sm">Loading reviews...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-500 text-sm">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold">No reviews found matching the filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Rating & Review</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Helpful</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Product */}
                    <td className="px-5 py-4 max-w-[200px]">
                      <div className="flex items-center gap-2.5">
                        {review.product.primaryImage && (
                          <img
                            src={review.product.primaryImage}
                            alt={review.product.name}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate text-xs">
                            {review.product.name}
                          </p>
                          {review.variantSummary && (
                            <span className="text-[11px] text-slate-400 truncate block">
                              {review.variantSummary.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-xs">
                          {review.customer.firstName} {review.customer.lastName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {review.customer.email}
                        </p>
                        {review.verifiedPurchase && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rating & Text */}
                    <td className="px-5 py-4 max-w-[280px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <RatingStars rating={review.rating} size="sm" />
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {review.rating}/5
                          </span>
                        </div>
                        {review.title && (
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {review.title}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {review.body}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <ReviewStatusBadge status={review.status} />
                    </td>

                    {/* Helpful count */}
                    <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {review.helpfulCount}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>

                    {/* Quick Moderation Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/reviews/${review.id}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {review.status !== 'PUBLISHED' && (
                          <button
                            type="button"
                            disabled={moderatingId === review.id}
                            onClick={() => handleQuickStatusChange(review.id, 'PUBLISHED')}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            title="Publish Review"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {review.status !== 'HIDDEN' && (
                          <button
                            type="button"
                            disabled={moderatingId === review.id}
                            onClick={() => handleQuickStatusChange(review.id, 'HIDDEN')}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="Hide Review"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}

                        {review.status !== 'REJECTED' && (
                          <button
                            type="button"
                            disabled={moderatingId === review.id}
                            onClick={() => handleQuickStatusChange(review.id, 'REJECTED')}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Reject Review"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
