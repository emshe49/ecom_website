import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { promotionController } from './promotion.controller.js';

export const promotionRouter = Router();

// Customer coupon application routes
promotionRouter.post('/coupon', authenticate, promotionController.applyCoupon);
promotionRouter.delete('/coupon', authenticate, promotionController.removeCoupon);
