import { Router } from 'express';
import { adminShippingController } from './admin-shipping.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  requirePermission,
  requireAnyPermission,
} from '../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';

export const adminShippingMethodRouter = Router();
export const adminShipmentRouter = Router();

// Require authentication for all admin routes
adminShippingMethodRouter.use(authenticate);
adminShipmentRouter.use(authenticate);

// --- Shipping Methods Management ---
adminShippingMethodRouter.get(
  '/',
  requireAnyPermission(PERMISSIONS.SHIPPING_READ, PERMISSIONS.SHIPPING_MANAGE),
  adminShippingController.listShippingMethods
);

adminShippingMethodRouter.post(
  '/',
  requirePermission(PERMISSIONS.SHIPPING_MANAGE),
  adminShippingController.createShippingMethod
);

adminShippingMethodRouter.get(
  '/:id',
  requireAnyPermission(PERMISSIONS.SHIPPING_READ, PERMISSIONS.SHIPPING_MANAGE),
  adminShippingController.getShippingMethod
);

adminShippingMethodRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.SHIPPING_MANAGE),
  adminShippingController.updateShippingMethod
);

adminShippingMethodRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.SHIPPING_MANAGE),
  adminShippingController.updateShippingMethod
);

adminShippingMethodRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.SHIPPING_MANAGE),
  adminShippingController.deleteShippingMethod
);

// --- Shipments Management ---
adminShipmentRouter.get(
  '/',
  requireAnyPermission(PERMISSIONS.SHIPPING_READ, PERMISSIONS.SHIPPING_FULFILL),
  adminShippingController.listShipments
);

adminShipmentRouter.get(
  '/order/:orderId',
  requireAnyPermission(PERMISSIONS.SHIPPING_READ, PERMISSIONS.SHIPPING_FULFILL),
  adminShippingController.getShipmentByOrder
);

adminShipmentRouter.post(
  '/order/:orderId',
  requirePermission(PERMISSIONS.SHIPPING_FULFILL),
  adminShippingController.createShipment
);

adminShipmentRouter.get(
  '/:shipmentId',
  requireAnyPermission(PERMISSIONS.SHIPPING_READ, PERMISSIONS.SHIPPING_FULFILL),
  adminShippingController.getShipmentDetail
);

adminShipmentRouter.put(
  '/:shipmentId/status',
  requirePermission(PERMISSIONS.SHIPPING_FULFILL),
  adminShippingController.updateShipmentStatus
);

adminShipmentRouter.patch(
  '/:shipmentId/status',
  requirePermission(PERMISSIONS.SHIPPING_FULFILL),
  adminShippingController.updateShipmentStatus
);

adminShipmentRouter.put(
  '/:shipmentId/tracking',
  requirePermission(PERMISSIONS.SHIPPING_FULFILL),
  adminShippingController.updateShipmentTracking
);

adminShipmentRouter.patch(
  '/:shipmentId/tracking',
  requirePermission(PERMISSIONS.SHIPPING_FULFILL),
  adminShippingController.updateShipmentTracking
);

adminShipmentRouter.post(
  '/:shipmentId/cancel',
  requirePermission(PERMISSIONS.SHIPPING_FULFILL),
  adminShippingController.cancelShipment
);
