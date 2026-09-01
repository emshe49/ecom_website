import { Router } from 'express';
import { cartController } from './cart.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  addToCartSchema,
  updateCartItemSchema,
  cartVariantParamSchema,
} from './cart.validation.js';
import { ROLES } from '../authorization/roles.js';

export const cartRouter = Router();

// All cart operations require authentication and CUSTOMER role
cartRouter.use(authenticate, authorizeRoles(ROLES.CUSTOMER));

// GET /api/v1/cart - Retrieve customer's cart
cartRouter.get('/', (req, res, next) => cartController.getCart(req, res, next));

// POST /api/v1/cart/items - Add item to cart or increment quantity
cartRouter.post(
  '/items',
  validateRequest({ body: addToCartSchema }),
  (req, res, next) => cartController.addItem(req, res, next)
);

// PATCH /api/v1/cart/items/:variantId - Update quantity for specific variant
cartRouter.patch(
  '/items/:variantId',
  validateRequest({
    params: cartVariantParamSchema,
    body: updateCartItemSchema,
  }),
  (req, res, next) => cartController.updateItemQuantity(req, res, next)
);

// DELETE /api/v1/cart/items/:variantId - Remove specific variant from cart
cartRouter.delete(
  '/items/:variantId',
  validateRequest({ params: cartVariantParamSchema }),
  (req, res, next) => cartController.removeItem(req, res, next)
);

// DELETE /api/v1/cart - Clear all items from cart
cartRouter.delete('/', (req, res, next) => cartController.clearCart(req, res, next));
