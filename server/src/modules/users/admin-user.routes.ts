import { Router } from 'express';
import { adminUserController } from './admin-user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  createStaffSchema,
  updateStaffRoleSchema,
  updateStaffStatusSchema,
  staffIdParamSchema,
} from './admin-user.validation.js';

const router = Router();

// All administrative user endpoints require authentication
router.use(authenticate);

router.post(
  '/',
  requirePermission(PERMISSIONS.ADMIN_USER_CREATE),
  validateRequest({ body: createStaffSchema }),
  (req, res, next) => adminUserController.createStaff(req, res, next)
);

router.get(
  '/',
  requirePermission(PERMISSIONS.ADMIN_USER_READ),
  (req, res, next) => adminUserController.listStaff(req, res, next)
);

router.patch(
  '/:userId/role',
  requirePermission(PERMISSIONS.ADMIN_USER_UPDATE_ROLE),
  validateRequest({ params: staffIdParamSchema, body: updateStaffRoleSchema }),
  (req, res, next) => adminUserController.updateRole(req, res, next)
);

router.patch(
  '/:userId/status',
  requirePermission(PERMISSIONS.ADMIN_USER_DISABLE),
  validateRequest({ params: staffIdParamSchema, body: updateStaffStatusSchema }),
  (req, res, next) => adminUserController.updateStatus(req, res, next)
);

export const adminUserRouter = router;
