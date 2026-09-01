import { Types } from 'mongoose';
import { Review } from './review.model.js';
import { ReviewHelpfulVote } from './review-helpful-vote.model.js';
import { Product } from '../catalog/products/product.model.js';
import { REVIEW_STATUS } from './review.constants.js';
import {
  CreateReviewInput,
  UpdateReviewInput,
  ModerateReviewInput,
  CustomerReviewDTO,
  AdminReviewDTO,
} from './review.types.js';
import { ReviewMapper } from './review.mapper.js';
import { reviewEligibilityService } from './review-eligibility.service.js';
import { reviewRatingService } from './review-rating.service.js';
import { notificationService } from '../notifications/notification.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/utils/logger.js';

export class ReviewService {
  /**
   * Creates a new verified customer review for a delivered product purchase.
   */
  async createReview(userId: string, input: CreateReviewInput): Promise<CustomerReviewDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const prodObjectId = new Types.ObjectId(input.productId);

    // 1. Verify product exists in catalog
    const product = await Product.findById(prodObjectId);
    if (!product) {
      throw AppError.notFound('Product not found.', ErrorCodes.ERR_PRODUCT_NOT_FOUND);
    }

    // 2. Check if customer already reviewed this product (one review per user per product)
    const existingReview = await Review.findOne({
      productId: prodObjectId,
      userId: userObjectId,
    });
    if (existingReview) {
      throw AppError.conflict(
        'You have already submitted a review for this product.',
        ErrorCodes.ERR_REVIEW_ALREADY_EXISTS
      );
    }

    // 3. Verify customer purchase eligibility from delivered orders
    const eligibility = await reviewEligibilityService.getEligiblePurchase(
      userObjectId,
      prodObjectId
    );
    if (!eligibility.isEligible || !eligibility.orderId) {
      throw AppError.forbidden(
        'Only customers with a completed, delivered purchase of this product are eligible to leave a review.',
        ErrorCodes.ERR_REVIEW_NOT_ELIGIBLE
      );
    }

    // 4. Create review document with server-authoritative fields
    const review = new Review({
      productId: prodObjectId,
      userId: userObjectId,
      orderId: eligibility.orderId,
      variantId: eligibility.variantId || null,
      rating: input.rating,
      title: input.title || null,
      body: input.body.trim(),
      status: REVIEW_STATUS.PUBLISHED,
      verifiedPurchase: true,
      helpfulCount: 0,
    });

    await review.save();

    // 5. Recalculate product rating aggregate
    await reviewRatingService.recalculateProductRating(prodObjectId);

    logger.info(`Customer ${userId} created review for product ${input.productId}`);

    const populatedReview = await Review.findById(review._id)
      .populate('productId', 'name slug images')
      .populate('variantId', 'name sku attributes');

    return ReviewMapper.toCustomerDTO(populatedReview || review);
  }

  /**
   * Updates an existing review by its owner.
   */
  async updateReview(
    userId: string,
    reviewId: string,
    input: UpdateReviewInput
  ): Promise<CustomerReviewDTO> {
    const userObjectId = new Types.ObjectId(userId);
    const reviewObjectId = new Types.ObjectId(reviewId);

    // IDOR protection: lookup strictly scoped to reviewId and userId
    const review = await Review.findOne({
      _id: reviewObjectId,
      userId: userObjectId,
    });

    if (!review) {
      throw AppError.notFound('Review not found.', ErrorCodes.ERR_REVIEW_NOT_FOUND);
    }

    let ratingChanged = false;
    if (input.rating !== undefined && input.rating !== review.rating) {
      review.rating = input.rating;
      ratingChanged = true;
    }

    if (input.title !== undefined) {
      review.title = input.title;
    }

    if (input.body !== undefined) {
      review.body = input.body.trim();
    }

    await review.save();

    // If rating changed, recalculate product rating aggregate
    if (ratingChanged) {
      await reviewRatingService.recalculateProductRating(review.productId);
    }

    logger.info(`Customer ${userId} updated review ${reviewId}`);

    const populatedReview = await Review.findById(review._id)
      .populate('productId', 'name slug images')
      .populate('variantId', 'name sku attributes');

    return ReviewMapper.toCustomerDTO(populatedReview || review);
  }

  /**
   * Deletes a review by its owner and recalculates product rating.
   */
  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const reviewObjectId = new Types.ObjectId(reviewId);

    // IDOR protection
    const review = await Review.findOne({
      _id: reviewObjectId,
      userId: userObjectId,
    });

    if (!review) {
      throw AppError.notFound('Review not found.', ErrorCodes.ERR_REVIEW_NOT_FOUND);
    }

    const productId = review.productId;

    // Remove associated helpful votes
    await ReviewHelpfulVote.deleteMany({ reviewId: reviewObjectId });

    // Hard delete review
    await Review.findByIdAndDelete(reviewObjectId);

    // Recalculate product rating aggregate
    await reviewRatingService.recalculateProductRating(productId);

    logger.info(`Customer ${userId} deleted review ${reviewId} for product ${productId}`);
  }

  /**
   * Marks a published review as helpful.
   * Prevents duplicate votes and self-voting.
   */
  async markHelpful(
    userId: string,
    reviewId: string
  ): Promise<{ helpfulCount: number; isHelpfulByUser: boolean }> {
    const userObjectId = new Types.ObjectId(userId);
    const reviewObjectId = new Types.ObjectId(reviewId);

    const review = await Review.findById(reviewObjectId);
    if (!review) {
      throw AppError.notFound('Review not found.', ErrorCodes.ERR_REVIEW_NOT_FOUND);
    }

    // Only published reviews can receive helpful votes
    if (review.status !== REVIEW_STATUS.PUBLISHED) {
      throw AppError.badRequest(
        'Cannot vote on reviews that are not published.',
        ErrorCodes.ERR_REVIEW_NOT_PUBLISHED
      );
    }

    // Prevent author from marking their own review helpful
    if (review.userId.toString() === userId) {
      throw AppError.badRequest(
        'You cannot mark your own review as helpful.',
        ErrorCodes.ERR_REVIEW_SELF_HELPFUL_NOT_ALLOWED
      );
    }

    // Check if vote already exists (idempotent)
    const existingVote = await ReviewHelpfulVote.findOne({
      reviewId: reviewObjectId,
      userId: userObjectId,
    });

    if (existingVote) {
      return {
        helpfulCount: review.helpfulCount,
        isHelpfulByUser: true,
      };
    }

    try {
      await ReviewHelpfulVote.create({
        reviewId: reviewObjectId,
        userId: userObjectId,
      });

      const updated = await Review.findByIdAndUpdate(
        reviewObjectId,
        { $inc: { helpfulCount: 1 } },
        { new: true }
      );

      return {
        helpfulCount: updated?.helpfulCount || review.helpfulCount + 1,
        isHelpfulByUser: true,
      };
    } catch (err: any) {
      // Handle race condition on unique index { reviewId, userId }
      if (err.code === 11000) {
        const current = await Review.findById(reviewObjectId);
        return {
          helpfulCount: current?.helpfulCount || review.helpfulCount,
          isHelpfulByUser: true,
        };
      }
      throw err;
    }
  }

  /**
   * Removes a helpful vote from a review.
   */
  async removeHelpful(
    userId: string,
    reviewId: string
  ): Promise<{ helpfulCount: number; isHelpfulByUser: boolean }> {
    const userObjectId = new Types.ObjectId(userId);
    const reviewObjectId = new Types.ObjectId(reviewId);

    const review = await Review.findById(reviewObjectId);
    if (!review) {
      throw AppError.notFound('Review not found.', ErrorCodes.ERR_REVIEW_NOT_FOUND);
    }

    const deletedVote = await ReviewHelpfulVote.findOneAndDelete({
      reviewId: reviewObjectId,
      userId: userObjectId,
    });

    if (deletedVote) {
      const updated = await Review.findByIdAndUpdate(
        reviewObjectId,
        { $inc: { helpfulCount: -1 } },
        { new: true }
      );

      // Ensure helpfulCount does not drop below 0
      if (updated && updated.helpfulCount < 0) {
        await Review.updateOne({ _id: reviewObjectId }, { $set: { helpfulCount: 0 } });
        return { helpfulCount: 0, isHelpfulByUser: false };
      }

      return {
        helpfulCount: updated?.helpfulCount ?? 0,
        isHelpfulByUser: false,
      };
    }

    return {
      helpfulCount: review.helpfulCount,
      isHelpfulByUser: false,
    };
  }

  /**
   * Administrative review moderation (PUBLISHED, HIDDEN, REJECTED)
   */
  async moderateReview(
    adminId: string,
    reviewId: string,
    input: ModerateReviewInput
  ): Promise<AdminReviewDTO> {
    const reviewObjectId = new Types.ObjectId(reviewId);
    const adminObjectId = new Types.ObjectId(adminId);

    const review = await Review.findById(reviewObjectId);
    if (!review) {
      throw AppError.notFound('Review not found.', ErrorCodes.ERR_REVIEW_NOT_FOUND);
    }

    const oldStatus = review.status;
    review.status = input.status;
    review.moderationReason = input.reason || null;
    review.moderatedBy = adminObjectId;
    review.moderatedAt = new Date();

    await review.save();

    // Recalculate product rating if status moved in or out of PUBLISHED
    if (oldStatus !== input.status) {
      await reviewRatingService.recalculateProductRating(review.productId);
    }

    logger.info(
      `Admin ${adminId} moderated review ${reviewId} status from ${oldStatus} to ${input.status}`
    );

    const populatedReview = await Review.findById(reviewObjectId)
      .populate('productId', 'name slug images')
      .populate('userId', 'firstName lastName email')
      .populate('orderId', 'orderNumber')
      .populate('variantId', 'name sku attributes')
      .populate('moderatedBy', 'firstName lastName email');

    const productName = (populatedReview?.productId as any)?.name || 'Product';

    // Notify review author of moderation outcome
    notificationService
      .notifyReviewEvent(
        review.userId.toString(),
        review._id.toString(),
        productName,
        input.status,
        input.reason || undefined
      )
      .catch((err) =>
        logger.error(`Review moderation notification failed: ${err.message}`)
      );

    return ReviewMapper.toAdminDTO(populatedReview || review);
  }
}

export const reviewService = new ReviewService();
