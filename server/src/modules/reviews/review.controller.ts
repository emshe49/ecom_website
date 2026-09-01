import { Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service.js';
import { reviewQueryService } from './review-query.service.js';
import { reviewEligibilityService } from './review-eligibility.service.js';
import {
  createReviewSchema,
  updateReviewSchema,
  publicReviewQuerySchema,
  customerReviewQuerySchema,
  mongoIdParamSchema,
} from './review.validation.js';

export class ReviewController {
  /**
   * POST /api/v1/reviews
   * Authenticated customer creates a review for a purchased product
   */
  async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedBody = createReviewSchema.parse(req.body);
      const userId = (req as any).user.id;

      const review = await reviewService.createReview(userId, validatedBody);

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review created successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/reviews/:reviewId
   * Authenticated customer updates own review
   */
  async updateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = mongoIdParamSchema.parse(req.params.reviewId);
      const validatedBody = updateReviewSchema.parse(req.body);
      const userId = (req as any).user.id;

      const review = await reviewService.updateReview(userId, reviewId, validatedBody);

      res.status(200).json({
        success: true,
        data: review,
        message: 'Review updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/reviews/:reviewId
   * Authenticated customer deletes own review
   */
  async deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = mongoIdParamSchema.parse(req.params.reviewId);
      const userId = (req as any).user.id;

      await reviewService.deleteReview(userId, reviewId);

      res.status(200).json({
        success: true,
        message: 'Review deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reviews/me
   * Authenticated customer retrieves their own review history
   */
  async getMyReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = customerReviewQuerySchema.parse(req.query);
      const userId = (req as any).user.id;

      const result = await reviewQueryService.getCustomerReviews(userId, filters);

      res.status(200).json({
        success: true,
        data: result.reviews,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reviews/eligible-products
   * Authenticated customer fetches purchased products eligible to be reviewed
   */
  async getEligibleProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;

      const products = await reviewEligibilityService.getEligibleProductsToReview(userId);

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/products/:productId/reviews
   * Public endpoint to list reviews and rating breakdown for a product
   */
  async getPublicProductReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = mongoIdParamSchema.parse(req.params.productId);
      const filters = publicReviewQuerySchema.parse(req.query);
      const authenticatedUserId = (req as any).user?.id;

      const result = await reviewQueryService.getPublicProductReviews(
        productId,
        filters,
        authenticatedUserId
      );

      res.status(200).json({
        success: true,
        data: result.reviews,
        ratingSummary: result.ratingSummary,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/reviews/:reviewId/helpful
   * Authenticated customer marks a review as helpful
   */
  async markHelpful(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = mongoIdParamSchema.parse(req.params.reviewId);
      const userId = (req as any).user.id;

      const result = await reviewService.markHelpful(userId, reviewId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Helpful vote recorded.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/reviews/:reviewId/helpful
   * Authenticated customer removes helpful vote
   */
  async removeHelpful(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = mongoIdParamSchema.parse(req.params.reviewId);
      const userId = (req as any).user.id;

      const result = await reviewService.removeHelpful(userId, reviewId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Helpful vote removed.',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const reviewController = new ReviewController();
