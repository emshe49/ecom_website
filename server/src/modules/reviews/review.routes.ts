import { Router, Request, Response, NextFunction } from 'express';
import { reviewController } from './review.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';
import { ROLES } from '../authorization/roles.js';
import { verifyAccessToken } from '../auth/auth-token.service.js';
import { User } from '../users/user.model.js';

export const reviewRouter = Router();

const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.sub);
        if (user && user.isActive) {
          req.user = {
            id: user._id.toString(),
            role: user.role,
            email: user.email,
          };
        }
      }
    }
  } catch {
    // Ignore optional auth failure
  }
  next();
};

// 1. Public endpoint for product reviews
reviewRouter.get('/product/:productId', optionalAuthenticate, (req, res, next) =>
  reviewController.getPublicProductReviews(req, res, next)
);

// 2. Customer review routes
reviewRouter.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res, next) => reviewController.createReview(req, res, next)
);

reviewRouter.get(
  '/me',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res, next) => reviewController.getMyReviews(req, res, next)
);

reviewRouter.get(
  '/eligible-products',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res, next) => reviewController.getEligibleProducts(req, res, next)
);

reviewRouter.patch(
  '/:reviewId',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res, next) => reviewController.updateReview(req, res, next)
);

reviewRouter.delete(
  '/:reviewId',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res, next) => reviewController.deleteReview(req, res, next)
);

// 3. Helpful vote endpoints (Any authenticated user)
reviewRouter.post(
  '/:reviewId/helpful',
  authenticate,
  (req, res, next) => reviewController.markHelpful(req, res, next)
);

reviewRouter.delete(
  '/:reviewId/helpful',
  authenticate,
  (req, res, next) => reviewController.removeHelpful(req, res, next)
);
