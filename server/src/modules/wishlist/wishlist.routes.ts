import { Router } from 'express';
import { wishlistController } from './wishlist.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { ROLES } from '../authorization/roles.js';
import {
  addWishlistItemSchema,
  wishlistProductParamSchema,
} from './wishlist.validation.js';

export const wishlistRouter = Router();

// Enforce authentication & customer-only role on all wishlist endpoints
wishlistRouter.use(authenticate, authorizeRoles(ROLES.CUSTOMER));

wishlistRouter.get('/', (req, res, next) => wishlistController.getWishlist(req, res, next));

wishlistRouter.post(
  '/items',
  validateRequest({ body: addWishlistItemSchema }),
  (req, res, next) => wishlistController.addItem(req, res, next)
);

wishlistRouter.delete(
  '/items/:productId',
  validateRequest({ params: wishlistProductParamSchema }),
  (req, res, next) => wishlistController.removeItem(req, res, next)
);

wishlistRouter.delete('/', (req, res, next) => wishlistController.clearWishlist(req, res, next));

