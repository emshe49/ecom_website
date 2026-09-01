import { Router } from 'express';
import { categoryController } from './category.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { requirePermission } from '../../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../../authorization/permissions.js';
import { validateRequest } from '../../../middleware/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryQuerySchema,
  categoryIdParamSchema,
  categorySlugParamSchema,
} from './category.validation.js';

// Public Category Router
const publicRouter = Router();

publicRouter.get(
  '/',
  validateRequest({ query: categoryQuerySchema }),
  (req, res, next) => categoryController.listPublicCategories(req, res, next)
);

publicRouter.get('/tree', (req, res, next) =>
  categoryController.getPublicCategoryTree(req, res, next)
);

publicRouter.get(
  '/:slug',
  validateRequest({ params: categorySlugParamSchema }),
  (req, res, next) => categoryController.getPublicCategoryBySlug(req, res, next)
);

// Admin Category Router
const adminRouter = Router();

adminRouter.use(authenticate);

adminRouter.post(
  '/',
  requirePermission(PERMISSIONS.CATEGORY_CREATE),
  validateRequest({ body: createCategorySchema }),
  (req, res, next) => categoryController.createCategory(req, res, next)
);

adminRouter.get(
  '/',
  requirePermission(PERMISSIONS.CATEGORY_READ),
  validateRequest({ query: categoryQuerySchema }),
  (req, res, next) => categoryController.listAdminCategories(req, res, next)
);

adminRouter.get(
  '/:categoryId',
  requirePermission(PERMISSIONS.CATEGORY_READ),
  validateRequest({ params: categoryIdParamSchema }),
  (req, res, next) => categoryController.getCategoryById(req, res, next)
);

adminRouter.patch(
  '/:categoryId',
  requirePermission(PERMISSIONS.CATEGORY_UPDATE),
  validateRequest({ params: categoryIdParamSchema, body: updateCategorySchema }),
  (req, res, next) => categoryController.updateCategory(req, res, next)
);

adminRouter.delete(
  '/:categoryId',
  requirePermission(PERMISSIONS.CATEGORY_DELETE),
  validateRequest({ params: categoryIdParamSchema }),
  (req, res, next) => categoryController.deleteCategory(req, res, next)
);

export const publicCategoryRouter = publicRouter;
export const adminCategoryRouter = adminRouter;
