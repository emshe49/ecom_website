import { Types } from 'mongoose';
import { Review } from './review.model.js';
import { Product } from '../catalog/products/product.model.js';
import { REVIEW_STATUS } from './review.constants.js';
import { ProductRatingSummaryDTO } from './review.types.js';
import { logger } from '../../shared/utils/logger.js';

export class ReviewRatingService {
  /**
   * Recalculates product rating average, count, and 1-5 star distribution
   * from the source of truth (only status = 'PUBLISHED' reviews) and updates Product.
   */
  async recalculateProductRating(
    productId: string | Types.ObjectId
  ): Promise<ProductRatingSummaryDTO> {
    const prodObjectId = typeof productId === 'string' ? new Types.ObjectId(productId) : productId;

    const [aggResult] = await Review.aggregate([
      {
        $match: {
          productId: prodObjectId,
          status: REVIEW_STATUS.PUBLISHED,
        },
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalSum: { $sum: '$rating' },
          r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    let ratingAverage = 0;
    let ratingCount = 0;
    let ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    if (aggResult && aggResult.totalCount > 0) {
      ratingCount = aggResult.totalCount;
      ratingAverage = Math.round((aggResult.totalSum / aggResult.totalCount) * 100) / 100;
      ratingDistribution = {
        1: aggResult.r1 || 0,
        2: aggResult.r2 || 0,
        3: aggResult.r3 || 0,
        4: aggResult.r4 || 0,
        5: aggResult.r5 || 0,
      };
    }

    try {
      await Product.updateOne(
        { _id: prodObjectId },
        {
          $set: {
            ratingAverage,
            ratingCount,
            ratingDistribution,
          },
        }
      );
    } catch (err: any) {
      logger.error(`Failed to update product rating aggregate for product ${prodObjectId.toString()}: ${err?.message || err}`);
    }

    return {
      average: ratingAverage,
      count: ratingCount,
      distribution: ratingDistribution,
    };
  }
}

export const reviewRatingService = new ReviewRatingService();
