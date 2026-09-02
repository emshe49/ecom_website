import { Request, Response, NextFunction } from 'express';
import { couponService } from './coupon.service.js';
import { promotionService } from './promotion.service.js';
import { redemptionService } from './redemption.service.js';
import {
  createCouponSchema,
  updateCouponSchema,
  createPromotionSchema,
  updatePromotionSchema,
  adminCouponQuerySchema,
  adminPromotionQuerySchema,
} from './promotion.validation.js';

export const adminPromotionController = {
  // --- COUPONS ---

  async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createCouponSchema.parse(req.body);
      const userId = (req.user as any)?.id || (req.user as any)?.userId;
      const coupon = await couponService.createCoupon(validated, userId);

      res.status(201).json({
        success: true,
        data: coupon,
      });
    } catch (err) {
      next(err);
    }
  },

  async getCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = adminCouponQuerySchema.parse(req.query);
      const result = await couponService.getCoupons(query);

      res.status(200).json({
        success: true,
        data: result.coupons,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  async getCouponById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupon = await couponService.getCouponById(req.params.couponId as string);

      res.status(200).json({
        success: true,
        data: coupon,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateCouponSchema.parse(req.body);
      const coupon = await couponService.updateCoupon(req.params.couponId as string, validated);

      res.status(200).json({
        success: true,
        data: coupon,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await couponService.deleteCoupon(req.params.couponId as string);

      res.status(200).json({
        success: true,
        data: { message: 'Coupon deactivated successfully' },
      });
    } catch (err) {
      next(err);
    }
  },

  async getCouponRedemptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const result = await redemptionService.getCouponRedemptions(req.params.couponId as string, {
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result.redemptions,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  // --- PROMOTIONS ---

  async createPromotion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createPromotionSchema.parse(req.body);
      const userId = (req.user as any)?.id || (req.user as any)?.userId;
      const promo = await promotionService.createPromotion(validated, userId);

      res.status(201).json({
        success: true,
        data: promo,
      });
    } catch (err) {
      next(err);
    }
  },

  async getPromotions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = adminPromotionQuerySchema.parse(req.query);
      const result = await promotionService.getPromotions(query);

      res.status(200).json({
        success: true,
        data: result.promotions,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  async getPromotionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promo = await promotionService.getPromotionById(req.params.promotionId as string);

      res.status(200).json({
        success: true,
        data: promo,
      });
    } catch (err) {
      next(err);
    }
  },

  async updatePromotion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updatePromotionSchema.parse(req.body);
      const promo = await promotionService.updatePromotion(req.params.promotionId as string, validated);

      res.status(200).json({
        success: true,
        data: promo,
      });
    } catch (err) {
      next(err);
    }
  },

  async deletePromotion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await promotionService.deletePromotion(req.params.promotionId as string);

      res.status(200).json({
        success: true,
        data: { message: 'Promotion deactivated successfully' },
      });
    } catch (err) {
      next(err);
    }
  },
};
