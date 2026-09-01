import { Router } from 'express';
import { paymentController } from './payment.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../authorization/authorization.middleware.js';
import { ROLES } from '../authorization/roles.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = Router();

// ==========================================
// Customer Payment Routes (Authentication Required)
// ==========================================
router.get('/methods', paymentController.getPaymentMethods);
router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  paymentController.initiatePayment
);
router.get(
  '/order/:orderId',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  paymentController.getPaymentByOrderId
);

export const paymentRoutes = router;

// ==========================================
// Admin Payment Routes (RBAC Required)
// ==========================================
const adminRouter = Router();

adminRouter.use(authenticate);


adminRouter.get(
  '/',
  requirePermission(PERMISSIONS.PAYMENT_READ),
  paymentController.listAdminPayments
);

adminRouter.get(
  '/:paymentId',
  requirePermission(PERMISSIONS.PAYMENT_READ),
  paymentController.getAdminPaymentById
);

adminRouter.post(
  '/:paymentId/confirm-cod',
  requirePermission(PERMISSIONS.PAYMENT_CONFIRM),
  paymentController.confirmCodPayment
);

adminRouter.post(
  '/:paymentId/reconcile',
  requirePermission(PERMISSIONS.PAYMENT_RECONCILE),
  paymentController.reconcilePayment
);

export const adminPaymentRoutes = adminRouter;
