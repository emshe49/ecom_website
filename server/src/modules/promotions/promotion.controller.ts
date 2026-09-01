import { Request, Response, NextFunction } from 'express';
import { checkoutService } from '../checkout/checkout.service.js';
import { applyCouponSchema } from './promotion.validation.js';

export const promotionController = {
  /**
   * Applies coupon to current active checkout session.
   * POST /api/v1/checkout/coupon
   */
  async applyCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = applyCouponSchema.parse(req.body);
      const userId = (req.user as any)?.id || (req.user as any)?.userId;
      const session = await checkoutService.applyCouponToCheckout(
        userId,
        validated.code
      );

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Removes coupon from current active checkout session.
   * DELETE /api/v1/checkout/coupon
   */
  async removeCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.userId;
      const session = await checkoutService.removeCouponFromCheckout(userId);

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  },
};
