import React, { useState, useEffect } from 'react';
import { reviewsApi } from '../api/reviews.api';
import { CustomerReviewDTO, EligibleProductToReviewDTO } from '../types/review.types';
import { ReviewCard } from '../components/ReviewCard';
import { ReviewModal } from '../components/ReviewModal';
import {
  MessageSquare,
  PackageCheck,
  PlusCircle,
  Loader2,
  Calendar,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyReviewsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reviewed' | 'to-review'>('reviewed');
  const [reviews, setReviews] = useState<CustomerReviewDTO[]>([]);
  const [eligibleProducts, setEligibleProducts] = useState<EligibleProductToReviewDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<EligibleProductToReviewDTO | null>(null);
  const [selectedReview, setSelectedReview] = useState<CustomerReviewDTO | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewsRes, eligibleRes] = await Promise.all([
        reviewsApi.getMyReviews({ limit: 50 }),
        reviewsApi.getEligibleProducts(),
      ]);
      setReviews(reviewsRes.reviews);
      setEligibleProducts(eligibleRes);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load your reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = (product: EligibleProductToReviewDTO) => {
    setSelectedProduct(product);
    setSelectedReview(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (review: CustomerReviewDTO) => {
    setSelectedProduct(null);
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await reviewsApi.deleteReview(reviewId);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to delete review');
    }
  };

  const handleModalSuccess = () => {
    fetchData();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          Product Reviews
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Manage your ratings and share authentic feedback on products you've received.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8">
        <button
          type="button"
          onClick={() => setActiveTab('reviewed')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-bold text-sm transition-colors ${
            activeTab === 'reviewed'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Reviewed</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {reviews.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('to-review')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 font-bold text-sm transition-colors ${
            activeTab === 'to-review'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>To Review</span>
          {eligibleProducts.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold">
              {eligibleProducts.length}
            </span>
          )}
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-amber-500" />
          <p className="text-sm">Loading your reviews...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      ) : activeTab === 'reviewed' ? (
        /* Reviewed Tab Content */
        reviews.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">
              You haven't written any reviews yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              When your purchases are delivered, you'll find them waiting in the "To Review" tab to share your feedback.
            </p>
            {eligibleProducts.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('to-review')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow transition-all"
              >
                View {eligibleProducts.length} Eligible Products
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
              >
                {/* Product mini header */}
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                  {review.product?.primaryImage && (
                    <img
                      src={review.product.primaryImage}
                      alt={review.product.name}
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-800"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/products/${review.product?.slug}`}
                      className="font-bold text-sm text-slate-900 dark:text-white hover:text-amber-500 truncate block"
                    >
                      {review.product?.name}
                    </Link>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Product ID: {review.productId}
                    </span>
                  </div>
                </div>

                <ReviewCard
                  review={review}
                  isOwner={true}
                  onEdit={() => handleOpenEditModal(review)}
                  onDelete={() => handleDeleteReview(review.id)}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        /* To Review Tab Content */
        eligibleProducts.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
            <PackageCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">
              No products waiting for review
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
              You've reviewed all delivered items from your orders, or have no delivered orders yet.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow hover:bg-slate-800 transition-all"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eligibleProducts.map((item) => (
              <div
                key={item.productId}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-4 mb-3">
                    {item.primaryImage ? (
                      <img
                        src={item.primaryImage}
                        alt={item.productName}
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                        <Tag className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        to={`/products/${item.productSlug}`}
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-amber-500 line-clamp-2"
                      >
                        {item.productName}
                      </Link>
                      {item.variantSummary && (
                        <span className="inline-block mt-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {item.variantSummary.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <span>Order #{item.orderNumber}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Delivered {new Date(item.deliveredAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(item)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow hover:shadow-md transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Write a Review</span>
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct || undefined}
        existingReview={selectedReview}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};
