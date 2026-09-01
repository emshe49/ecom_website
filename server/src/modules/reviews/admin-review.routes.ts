import { Router } from 'express';
import { adminReviewController } from './admin-review.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';

export const adminReviewRouter = Router();

// Enforce authentication on all administrative review endpoints
adminReviewRouter.use(authenticate);

// 1. Administrative review search & listing
adminReviewRouter.get(
  '/',
  requirePermission(PERMISSIONS.REVIEW_READ),
  (req, res, next) => adminReviewController.getReviews(req, res, next)
);

// 2. Administrative single review detail
adminReviewRouter.get(
  '/:reviewId',
  requirePermission(PERMISSIONS.REVIEW_READ),
  (req, res, next) => adminReviewController.getReviewById(req, res, next)
);

// 3. Administrative review moderation
adminReviewRouter.patch(
  '/:reviewId/status',
  requirePermission(PERMISSIONS.REVIEW_MODERATE),
  (req, res, next) => adminReviewController.moderateReview(req, res, next)
);
