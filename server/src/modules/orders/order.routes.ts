import { Router } from 'express';
import { orderController } from './order.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../authorization/authorization.middleware.js';
import { ROLES } from '../authorization/roles.js';
import { PERMISSIONS } from '../authorization/permissions.js';

// Customer Order Routes: mounted at /api/v1/orders
export const orderRouter = Router();

orderRouter.use(authenticate, authorizeRoles(ROLES.CUSTOMER));

orderRouter.post('/', orderController.createOrder);
orderRouter.get('/', orderController.getMyOrders);
orderRouter.get('/:orderId', orderController.getMyOrderById);
orderRouter.post('/:orderId/cancel', orderController.cancelMyOrder);

// Admin Order Routes: mounted at /api/v1/admin/orders
export const adminOrderRouter = Router();

adminOrderRouter.use(authenticate);

adminOrderRouter.get(
  '/',
  requirePermission(PERMISSIONS.ORDER_READ),
  orderController.getAdminOrders
);

adminOrderRouter.get(
  '/:orderId',
  requirePermission(PERMISSIONS.ORDER_READ),
  orderController.getAdminOrderById
);

adminOrderRouter.patch(
  '/:orderId/status',
  requirePermission(PERMISSIONS.ORDER_UPDATE),
  orderController.updateAdminOrderStatus
);

adminOrderRouter.post(
  '/:orderId/cancel',
  requirePermission(PERMISSIONS.ORDER_CANCEL),
  orderController.cancelAdminOrder
);

adminOrderRouter.patch(
  '/:orderId/internal-note',
  requirePermission(PERMISSIONS.ORDER_UPDATE),
  orderController.updateAdminInternalNotes
);
