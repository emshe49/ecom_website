import { Router } from 'express';
import { brandController } from './brand.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { requirePermission } from '../../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../../authorization/permissions.js';
import { validateRequest } from '../../../middleware/validate.middleware.js';
import {
  createBrandSchema,
  updateBrandSchema,
  brandQuerySchema,
  brandIdParamSchema,
  brandSlugParamSchema,
} from './brand.validation.js';

// Public Brand Router
const publicRouter = Router();

publicRouter.get(
  '/',
  validateRequest({ query: brandQuerySchema }),
  (req, res, next) => brandController.listPublicBrands(req, res, next)
);

publicRouter.get(
  '/:slug',
  validateRequest({ params: brandSlugParamSchema }),
  (req, res, next) => brandController.getPublicBrandBySlug(req, res, next)
);

// Admin Brand Router
const adminRouter = Router();

adminRouter.use(authenticate);

adminRouter.post(
  '/',
  requirePermission(PERMISSIONS.BRAND_CREATE),
  validateRequest({ body: createBrandSchema }),
  (req, res, next) => brandController.createBrand(req, res, next)
);

adminRouter.get(
  '/',
  requirePermission(PERMISSIONS.BRAND_READ),
  validateRequest({ query: brandQuerySchema }),
  (req, res, next) => brandController.listAdminBrands(req, res, next)
);

adminRouter.get(
  '/:brandId',
  requirePermission(PERMISSIONS.BRAND_READ),
  validateRequest({ params: brandIdParamSchema }),
  (req, res, next) => brandController.getBrandById(req, res, next)
);

adminRouter.patch(
  '/:brandId',
  requirePermission(PERMISSIONS.BRAND_UPDATE),
  validateRequest({ params: brandIdParamSchema, body: updateBrandSchema }),
  (req, res, next) => brandController.updateBrand(req, res, next)
);

adminRouter.delete(
  '/:brandId',
  requirePermission(PERMISSIONS.BRAND_DELETE),
  validateRequest({ params: brandIdParamSchema }),
  (req, res, next) => brandController.deleteBrand(req, res, next)
);

export const publicBrandRouter = publicRouter;
export const adminBrandRouter = adminRouter;
