import { Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service.js';
import { reviewQueryService } from './review-query.service.js';
import {
  adminReviewQuerySchema,
  moderateReviewSchema,
  mongoIdParamSchema,
} from './review.validation.js';

export class AdminReviewController {
  /**
   * GET /api/v1/admin/reviews
   * Administrative search & list of all customer reviews
   */
  async getReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = adminReviewQuerySchema.parse(req.query);

      const result = await reviewQueryService.getAdminReviews(filters);

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
   * GET /api/v1/admin/reviews/:reviewId
   * Administrative view of a single review
   */
  async getReviewById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = mongoIdParamSchema.parse(req.params.reviewId);

      const review = await reviewQueryService.getAdminReviewById(reviewId);

      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/reviews/:reviewId/status
   * Administrative review moderation
   */
  async moderateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = mongoIdParamSchema.parse(req.params.reviewId);
      const validatedBody = moderateReviewSchema.parse(req.body);
      const adminId = (req as any).user.id;

      const updatedReview = await reviewService.moderateReview(adminId, reviewId, validatedBody);

      res.status(200).json({
        success: true,
        data: updatedReview,
        message: `Review marked as ${validatedBody.status}.`,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const adminReviewController = new AdminReviewController();
