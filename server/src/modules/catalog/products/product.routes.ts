import { Router } from 'express';
import { productController } from './product.controller.js';
import { productSearchController } from './search/product-search.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { requirePermission } from '../../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../../authorization/permissions.js';
import { validateRequest } from '../../../middleware/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  productQuerySchema,
  productIdParamSchema,
  productSlugParamSchema,
  createVariantSchema,
  updateVariantSchema,
  variantIdParamSchema,
} from './product.validation.js';
import {
  productSearchQuerySchema,
  productFacetsQuerySchema,
} from './search/product-search.validation.js';

// Public Products Router
const publicRouter = Router();

publicRouter.get(
  '/',
  validateRequest({ query: productSearchQuerySchema }),
  (req, res, next) => productSearchController.searchProducts(req, res, next)
);

publicRouter.get(
  '/facets',
  validateRequest({ query: productFacetsQuerySchema }),
  (req, res, next) => productSearchController.getFacets(req, res, next)
);

publicRouter.get(
  '/:slug',
  validateRequest({ params: productSlugParamSchema }),
  (req, res, next) => productController.getPublicProductBySlug(req, res, next)
);

// Admin Products Router
const adminRouter = Router();

adminRouter.use(authenticate);

// Product Admin Routes
adminRouter.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCT_CREATE),
  validateRequest({ body: createProductSchema }),
  (req, res, next) => productController.createProduct(req, res, next)
);

adminRouter.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCT_READ),
  validateRequest({ query: productQuerySchema }),
  (req, res, next) => productController.listAdminProducts(req, res, next)
);

adminRouter.get(
  '/:productId',
  requirePermission(PERMISSIONS.PRODUCT_READ),
  validateRequest({ params: productIdParamSchema }),
  (req, res, next) => productController.getProductById(req, res, next)
);

adminRouter.patch(
  '/:productId',
  requirePermission(PERMISSIONS.PRODUCT_UPDATE),
  validateRequest({ params: productIdParamSchema, body: updateProductSchema }),
  (req, res, next) => productController.updateProduct(req, res, next)
);

adminRouter.patch(
  '/:productId/status',
  requirePermission(PERMISSIONS.PRODUCT_PUBLISH),
  validateRequest({ params: productIdParamSchema, body: updateProductStatusSchema }),
  (req, res, next) => productController.updateProductStatus(req, res, next)
);

adminRouter.delete(
  '/:productId',
  requirePermission(PERMISSIONS.PRODUCT_DELETE),
  validateRequest({ params: productIdParamSchema }),
  (req, res, next) => productController.deleteProduct(req, res, next)
);

// Nested Variant Admin Routes
adminRouter.post(
  '/:productId/variants',
  requirePermission(PERMISSIONS.PRODUCT_UPDATE),
  validateRequest({ params: productIdParamSchema, body: createVariantSchema }),
  (req, res, next) => productController.createVariant(req, res, next)
);

adminRouter.get(
  '/:productId/variants',
  requirePermission(PERMISSIONS.PRODUCT_READ),
  validateRequest({ params: productIdParamSchema }),
  (req, res, next) => productController.listVariants(req, res, next)
);

adminRouter.get(
  '/:productId/variants/:variantId',
  requirePermission(PERMISSIONS.PRODUCT_READ),
  validateRequest({ params: variantIdParamSchema }),
  (req, res, next) => productController.getVariantById(req, res, next)
);

adminRouter.patch(
  '/:productId/variants/:variantId',
  requirePermission(PERMISSIONS.PRODUCT_UPDATE),
  validateRequest({ params: variantIdParamSchema, body: updateVariantSchema }),
  (req, res, next) => productController.updateVariant(req, res, next)
);

adminRouter.delete(
  '/:productId/variants/:variantId',
  requirePermission(PERMISSIONS.PRODUCT_DELETE),
  validateRequest({ params: variantIdParamSchema }),
  (req, res, next) => productController.deleteVariant(req, res, next)
);

export const publicProductRouter = publicRouter;
export const adminProductRouter = adminRouter;
