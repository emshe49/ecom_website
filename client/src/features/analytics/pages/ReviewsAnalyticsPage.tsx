import React, { useState } from 'react';
import { useReviewsAnalytics } from '../api/analytics.api';
import { AnalyticsFilterParams } from '../types/analytics.types';
import { ReportFilters } from '../components/ReportFilters';
import { ReportSummaryCard } from '../components/ReportSummaryCard';
import { RatingDistribution } from '../components/RatingDistribution';

export const ReviewsAnalyticsPage: React.FC = () => {
  const [params, setParams] = useState<AnalyticsFilterParams>({});

  const { data, isLoading, error } = useReviewsAnalytics(params);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Reviews & Ratings Sentiment</h1>
        <p className="text-xs text-slate-400 mt-1">
          Customer product ratings, review approval metrics, and catalog sentiment breakdown
        </p>
      </div>

      <ReportFilters
        onFilterChange={(newParams) => setParams((prev) => ({ ...prev, ...newParams }))}
        showGroupBy={false}
      />

      {error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
          Failed to load reviews sentiment report.
        </div>
      ) : isLoading ? (
        <div className="h-64 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800"></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="Total Reviews"
              comparison={data?.summary.totalReviews}
              format="number"
            />
            <ReportSummaryCard
              title="Published Reviews"
              comparison={data?.summary.publishedReviews}
              format="number"
            />
            <ReportSummaryCard
              title="Catalog Average Rating"
              value={data?.summary.averageRating || 0}
              format="number"
              subtitle="1.0 - 5.0 scale"
            />
            <ReportSummaryCard
              title="Verified Buyer Rate"
              value={data?.summary.verifiedPurchaseRate || 0}
              format="percentage"
            />
          </div>

          {/* Rating Distribution Component */}
          {data?.ratingDistribution && (
            <RatingDistribution
              distribution={data.ratingDistribution}
              averageRating={data.summary.averageRating}
              totalReviews={data.summary.totalReviews.current}
            />
          )}

          {/* Top & Lowest Rated Products */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                <span>🏆</span> Top Rated Products (min 3 reviews)
              </h3>
              <div className="space-y-2.5">
                {data?.topRatedProducts.length ? (
                  data.topRatedProducts.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                      <span className="font-semibold text-white">{p.productName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold font-mono">★ {p.averageRating.toFixed(1)}</span>
                        <span className="text-slate-500 font-mono">({p.reviewCount})</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 py-4 text-center">No qualified top-rated products yet.</div>
                )}
              </div>
            </div>

            {/* Lowest */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                <span>⚠️</span> Lowest Rated Products (min 3 reviews)
              </h3>
              <div className="space-y-2.5">
                {data?.lowestRatedProducts.length ? (
                  data.lowestRatedProducts.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                      <span className="font-semibold text-white">{p.productName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 font-bold font-mono">★ {p.averageRating.toFixed(1)}</span>
                        <span className="text-slate-500 font-mono">({p.reviewCount})</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 py-4 text-center">No qualified low-rated products.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewsAnalyticsPage;
