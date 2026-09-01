import { Router } from 'express';
import { checkoutController } from './checkout.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { createCheckoutSchema } from './checkout.validation.js';
import { ROLES } from '../authorization/roles.js';

export const checkoutRouter = Router();

// All checkout operations require authentication and CUSTOMER role
checkoutRouter.use(authenticate, authorizeRoles(ROLES.CUSTOMER));

// POST /api/v1/checkout - Create a new Checkout session (reserves stock)
checkoutRouter.post(
  '/',
  validateRequest({ body: createCheckoutSchema }),
  (req, res, next) => checkoutController.createCheckoutSession(req, res, next)
);

// GET /api/v1/checkout - Get active Checkout session
checkoutRouter.get('/', (req, res, next) =>
  checkoutController.getActiveCheckout(req, res, next)
);

// POST /api/v1/checkout/revalidate - Revalidate active Checkout session before order placement
checkoutRouter.post('/revalidate', (req, res, next) =>
  checkoutController.revalidateCheckout(req, res, next)
);

// DELETE /api/v1/checkout - Cancel active Checkout session and release reserved stock
checkoutRouter.delete('/', (req, res, next) =>
  checkoutController.cancelCheckout(req, res, next)
);
