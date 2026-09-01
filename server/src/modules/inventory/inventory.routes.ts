import { Router } from 'express';
import { inventoryController } from './inventory.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  requirePermission,
  requireAnyPermission,
} from '../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  inventoryFilterSchema,
  inventoryVariantParamSchema,
  stockAdjustmentSchema,
  updateThresholdSchema,
  transactionFilterSchema,
} from './inventory.validation.js';

export const inventoryRouter = Router();

// All inventory management routes require authentication
inventoryRouter.use(authenticate);

// 1. List inventory items across variants (with filters & search)
inventoryRouter.get(
  '/',
  requirePermission(PERMISSIONS.INVENTORY_READ),
  validateRequest({ query: inventoryFilterSchema }),
  (req, res, next) => inventoryController.listInventory(req, res, next)
);

// 2. Global transaction history
inventoryRouter.get(
  '/transactions',
  requirePermission(PERMISSIONS.INVENTORY_READ),
  validateRequest({ query: transactionFilterSchema }),
  (req, res, next) => inventoryController.listAllTransactions(req, res, next)
);

// 3. Get inventory detail for a specific variant
inventoryRouter.get(
  '/:variantId',
  requirePermission(PERMISSIONS.INVENTORY_READ),
  validateRequest({ params: inventoryVariantParamSchema }),
  (req, res, next) => inventoryController.getInventoryDetail(req, res, next)
);

// 4. Adjust stock for a variant (STOCK_IN, STOCK_OUT, ADJUSTMENT)
inventoryRouter.post(
  '/:variantId/adjust',
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  validateRequest({
    params: inventoryVariantParamSchema,
    body: stockAdjustmentSchema,
  }),
  (req, res, next) => inventoryController.adjustStock(req, res, next)
);

// 5. Update low stock threshold for a variant
inventoryRouter.patch(
  '/:variantId/threshold',
  requireAnyPermission(
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_UPDATE
  ),
  validateRequest({
    params: inventoryVariantParamSchema,
    body: updateThresholdSchema,
  }),
  (req, res, next) => inventoryController.updateThreshold(req, res, next)
);

// 6. List transactions for a specific variant
inventoryRouter.get(
  '/:variantId/transactions',
  requirePermission(PERMISSIONS.INVENTORY_READ),
  validateRequest({
    params: inventoryVariantParamSchema,
    query: transactionFilterSchema,
  }),
  (req, res, next) => inventoryController.listTransactions(req, res, next)
);
