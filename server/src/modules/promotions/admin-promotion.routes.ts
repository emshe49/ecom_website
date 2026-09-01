import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { adminPromotionController } from './admin-promotion.controller.js';

export const adminCouponRouter = Router();

adminCouponRouter.use(authenticate);

// List coupons
adminCouponRouter.get(
  '/',
  requirePermission(PERMISSIONS.COUPON_READ),
  adminPromotionController.getCoupons
);

// Create coupon
adminCouponRouter.post(
  '/',
  requirePermission(PERMISSIONS.COUPON_CREATE),
  adminPromotionController.createCoupon
);

// Get coupon details
adminCouponRouter.get(
  '/:couponId',
  requirePermission(PERMISSIONS.COUPON_READ),
  adminPromotionController.getCouponById
);

// Update coupon
adminCouponRouter.patch(
  '/:couponId',
  requirePermission(PERMISSIONS.COUPON_UPDATE),
  adminPromotionController.updateCoupon
);

// Delete/deactivate coupon
adminCouponRouter.delete(
  '/:couponId',
  requirePermission(PERMISSIONS.COUPON_DELETE),
  adminPromotionController.deleteCoupon
);

// Get redemption history
adminCouponRouter.get(
  '/:couponId/redemptions',
  requirePermission(PERMISSIONS.COUPON_READ),
  adminPromotionController.getCouponRedemptions
);

export const adminPromotionRouter = Router();

adminPromotionRouter.use(authenticate);

// List promotions
adminPromotionRouter.get(
  '/',
  requirePermission(PERMISSIONS.PROMOTION_READ),
  adminPromotionController.getPromotions
);

// Create promotion
adminPromotionRouter.post(
  '/',
  requirePermission(PERMISSIONS.PROMOTION_CREATE),
  adminPromotionController.createPromotion
);

// Get promotion details
adminPromotionRouter.get(
  '/:promotionId',
  requirePermission(PERMISSIONS.PROMOTION_READ),
  adminPromotionController.getPromotionById
);

// Update promotion
adminPromotionRouter.patch(
  '/:promotionId',
  requirePermission(PERMISSIONS.PROMOTION_UPDATE),
  adminPromotionController.updatePromotion
);

// Delete/deactivate promotion
adminPromotionRouter.delete(
  '/:promotionId',
  requirePermission(PERMISSIONS.PROMOTION_DELETE),
  adminPromotionController.deletePromotion
);
