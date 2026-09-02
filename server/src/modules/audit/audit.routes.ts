import { Router } from 'express';
import { auditController } from './audit.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = Router();

// All audit routes require authentication and specific audit permissions
router.use(authenticate);

// Export route placed BEFORE :auditLogId parameter route to avoid route shadowing
router.get(
  '/export',
  requirePermission(PERMISSIONS.AUDIT_EXPORT),
  auditController.exportAuditLogs.bind(auditController)
);

router.get(
  '/',
  requirePermission(PERMISSIONS.AUDIT_READ),
  auditController.listAuditLogs.bind(auditController)
);

router.get(
  '/:auditLogId',
  requirePermission(PERMISSIONS.AUDIT_READ),
  auditController.getAuditLogById.bind(auditController)
);

router.get(
  '/:auditLogId/verify',
  requirePermission(PERMISSIONS.AUDIT_READ),
  auditController.verifyAuditLog.bind(auditController)
);

export default router;
