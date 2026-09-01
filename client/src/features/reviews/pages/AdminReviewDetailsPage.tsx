import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { reviewsApi } from '../api/reviews.api';
import { AdminReviewDTO, ReviewStatusType } from '../types/review.types';
import { RatingStars } from '../components/RatingStars';
import { ReviewStatusBadge } from '../components/ReviewStatusBadge';
import {
  ArrowLeft,
  User,
  ShoppingBag,
  Package,
  ShieldCheck,
  ThumbsUp,
  CheckCircle2,
  Loader2,
  Clock,
} from 'lucide-react';

export const AdminReviewDetailsPage: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<AdminReviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Moderation form
  const [status, setStatus] = useState<ReviewStatusType>('PUBLISHED');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchReviewDetails = async () => {
    if (!reviewId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await reviewsApi.getAdminReviewById(reviewId);
      setReview(data);
      setStatus(data.status);
      setReason(data.moderationReason || '');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to fetch review details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewDetails();
  }, [reviewId]);

  const handleModerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewId) return;

    if ((status === 'HIDDEN' || status === 'REJECTED') && reason.trim().length < 5) {
      alert('A moderation reason of at least 5 characters is required when hiding or rejecting a review.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await reviewsApi.moderateReview(reviewId, {
        status,
        reason: reason.trim() || null,
      });
      setReview(updated);
      setSuccessMessage(`Review status successfully updated to ${status}.`);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update review status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-amber-500" />
        <p className="text-sm font-medium">Loading review details...</p>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => navigate('/admin/reviews')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reviews</span>
        </button>
        <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400 text-sm">
          {error || 'Review not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/admin/reviews')}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reviews</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Review Moderation Detail
            </h1>
            <ReviewStatusBadge status={review.status} />
          </div>
          <p className="text-xs text-slate-400">Review ID: {review.id}</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300">
          <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />
          <span>{review.helpfulCount} Helpful Votes</span>
        </div>
      </div>

      {/* Grid: Context & Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Review Content & Moderation Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Review Content Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RatingStars rating={review.rating} size="lg" />
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {review.rating} / 5
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Created on {new Date(review.createdAt).toLocaleString()}
              </span>
            </div>

            {review.title && (
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {review.title}
              </h3>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {review.body}
              </p>
            </div>
          </div>

          {/* Moderation Form Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Moderation Action
            </h3>

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleModerationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Review Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PUBLISHED', 'HIDDEN', 'REJECTED'] as ReviewStatusType[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        status === st
                          ? st === 'PUBLISHED'
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : st === 'HIDDEN'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="moderation-reason"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  Moderation Note / Reason{' '}
                  {(status === 'HIDDEN' || status === 'REJECTED') && (
                    <span className="text-rose-500">* (Required)</span>
                  )}
                </label>
                <textarea
                  id="moderation-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this review is being hidden or rejected (e.g., vulgar language, personal information, fake content)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Update Moderation Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Customer, Product & Order Snapshots */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              <User className="w-4 h-4 text-amber-500" />
              <span>Customer</span>
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {review.customer.firstName} {review.customer.lastName}
              </p>
              <p className="text-xs text-slate-400">{review.customer.email}</p>
              <p className="text-[11px] text-slate-400 mt-1">ID: {review.userId}</p>
            </div>
            {review.verifiedPurchase && (
              <div className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Purchase</span>
              </div>
            )}
          </div>

          {/* Product Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Package className="w-4 h-4 text-amber-500" />
              <span>Product</span>
            </div>
            <div className="flex items-center gap-3">
              {review.product.primaryImage && (
                <img
                  src={review.product.primaryImage}
                  alt={review.product.name}
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                />
              )}
              <div className="min-w-0">
                <Link
                  to={`/products/${review.product.slug}`}
                  target="_blank"
                  className="font-bold text-xs text-slate-900 dark:text-white hover:text-amber-500 line-clamp-2"
                >
                  {review.product.name}
                </Link>
                {review.variantSummary && (
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {review.variantSummary.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Order Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span>Delivered Order</span>
            </div>
            <div>
              <Link
                to={`/admin/orders/${review.orderId}`}
                className="font-bold text-xs text-amber-600 hover:underline"
              >
                Order #{review.orderNumber || review.orderId}
              </Link>
            </div>
          </div>

          {/* Audit History */}
          {review.moderatedAt && (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5" />
                <span>Last Moderated</span>
              </div>
              <p>By: {review.moderatedBy || 'Staff'}</p>
              <p>At: {new Date(review.moderatedAt).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
