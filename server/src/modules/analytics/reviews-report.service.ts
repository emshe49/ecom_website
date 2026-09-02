import { Review } from '../reviews/review.model.js';
import { REVIEW_STATUS } from '../reviews/review.constants.js';
import { Product } from '../catalog/products/product.model.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  AnalyticsBaseQuery,
  ReviewsReportResponse,
  RatingDistributionPoint,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class ReviewsReportService {
  async getReviewsReport(query: AnalyticsBaseQuery): Promise<ReviewsReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const [currentStats, prevStats, ratingDist, topProducts, lowestProducts] = await Promise.all([
      this.calculateReviewStats(fromDate, toDate),
      this.calculateReviewStats(prevFromDate, prevToDate),
      this.calculateRatingDistribution(fromDate, toDate),
      this.getTopRatedProducts(fromDate, toDate),
      this.getLowestRatedProducts(fromDate, toDate),
    ]);

    return {
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        previousFrom: prevFromDate.toISOString(),
        previousTo: prevToDate.toISOString(),
        groupBy,
        currency: 'USD',
        generatedAt: new Date().toISOString(),
      },
      summary: {
        totalReviews: analyticsDateService.buildMetricComparison(
          currentStats.total,
          prevStats.total
        ),
        publishedReviews: analyticsDateService.buildMetricComparison(
          currentStats.published,
          prevStats.published
        ),
        hiddenReviews: analyticsDateService.buildMetricComparison(
          currentStats.hidden,
          prevStats.hidden
        ),
        rejectedReviews: analyticsDateService.buildMetricComparison(
          currentStats.rejected,
          prevStats.rejected
        ),
        averageRating: currentStats.averageRating,
        verifiedPurchaseRate: currentStats.verifiedPurchaseRate,
      },
      ratingDistribution: ratingDist,
      topRatedProducts: topProducts,
      lowestRatedProducts: lowestProducts,
    };
  }

  private async calculateReviewStats(from: Date, to: Date) {
    const agg = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ['$status', REVIEW_STATUS.PUBLISHED] }, 1, 0] },
          },
          hidden: {
            $sum: { $cond: [{ $eq: ['$status', REVIEW_STATUS.HIDDEN] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', REVIEW_STATUS.REJECTED] }, 1, 0] },
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$isVerifiedPurchase', true] }, 1, 0] },
          },
          avgRating: {
            $avg: {
              $cond: [{ $eq: ['$status', REVIEW_STATUS.PUBLISHED] }, '$rating', null],
            },
          },
        },
      },
    ]);

    const row = agg[0] || {
      total: 0,
      published: 0,
      hidden: 0,
      rejected: 0,
      verified: 0,
      avgRating: 0,
    };

    const verifiedPurchaseRate =
      row.total > 0 ? Number(((row.verified / row.total) * 100).toFixed(2)) : 0;
    const averageRating = row.avgRating ? Number(Number(row.avgRating).toFixed(2)) : 0;

    return {
      total: row.total,
      published: row.published,
      hidden: row.hidden,
      rejected: row.rejected,
      averageRating,
      verifiedPurchaseRate,
    };
  }

  private async calculateRatingDistribution(from: Date, to: Date): Promise<RatingDistributionPoint[]> {
    const agg = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: REVIEW_STATUS.PUBLISHED,
        },
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map<number, number>();
    let totalPublished = 0;
    agg.forEach((r) => {
      countMap.set(r._id, r.count);
      totalPublished += r.count;
    });

    const dist: RatingDistributionPoint[] = [];
    for (let star = 5; star >= 1; star--) {
      const count = countMap.get(star) || 0;
      const percentage =
        totalPublished > 0 ? Number(((count / totalPublished) * 100).toFixed(1)) : 0;
      dist.push({ rating: star, count, percentage });
    }

    return dist;
  }

  private async getTopRatedProducts(from: Date, to: Date) {
    const raw = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: REVIEW_STATUS.PUBLISHED,
        },
      },
      {
        $group: {
          _id: '$productId',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $match: {
          reviewCount: { $gte: ANALYTICS_CONSTANTS.MIN_REVIEWS_FOR_TOP_RATED },
        },
      },
      { $sort: { avgRating: -1, reviewCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: Product.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    ]);

    return raw.map((r) => ({
      productId: r._id ? r._id.toString() : '',
      productName: r.product?.name || 'Product',
      averageRating: Number(Number(r.avgRating || 0).toFixed(2)),
      reviewCount: r.reviewCount,
    }));
  }

  private async getLowestRatedProducts(from: Date, to: Date) {
    const raw = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: REVIEW_STATUS.PUBLISHED,
        },
      },
      {
        $group: {
          _id: '$productId',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
      {
        $match: {
          reviewCount: { $gte: ANALYTICS_CONSTANTS.MIN_REVIEWS_FOR_TOP_RATED },
        },
      },
      { $sort: { avgRating: 1, reviewCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: Product.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    ]);

    return raw.map((r) => ({
      productId: r._id ? r._id.toString() : '',
      productName: r.product?.name || 'Product',
      averageRating: Number(Number(r.avgRating || 0).toFixed(2)),
      reviewCount: r.reviewCount,
    }));
  }
}

export const reviewsReportService = new ReviewsReportService();
