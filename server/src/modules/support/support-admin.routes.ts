import { Router } from 'express';
import { supportAdminController } from './support-admin.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';

export const adminSupportRouter = Router();

// All admin support routes require authentication
adminSupportRouter.use(authenticate);

// Queue & Detail
adminSupportRouter.get(
  '/',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  supportAdminController.getSupportQueue
);

adminSupportRouter.get(
  '/:ticketId',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  supportAdminController.getTicketDetails
);

// Messages & Notes
adminSupportRouter.post(
  '/:ticketId/messages',
  requirePermission(PERMISSIONS.SUPPORT_REPLY),
  supportAdminController.replyToTicket
);

adminSupportRouter.post(
  '/:ticketId/internal-notes',
  requirePermission(PERMISSIONS.SUPPORT_INTERNAL_NOTE),
  supportAdminController.addInternalNote
);

// Assignment
adminSupportRouter.post(
  '/:ticketId/assign',
  requirePermission(PERMISSIONS.SUPPORT_ASSIGN),
  supportAdminController.assignTicket
);

adminSupportRouter.post(
  '/:ticketId/assign-to-me',
  requirePermission(PERMISSIONS.SUPPORT_ASSIGN),
  supportAdminController.assignToMe
);

// Priority & Status
adminSupportRouter.patch(
  '/:ticketId/priority',
  requirePermission(PERMISSIONS.SUPPORT_UPDATE),
  supportAdminController.updatePriority
);

adminSupportRouter.patch(
  '/:ticketId/status',
  requirePermission(PERMISSIONS.SUPPORT_UPDATE),
  supportAdminController.updateStatus
);

// Resolution & Close
adminSupportRouter.post(
  '/:ticketId/resolve',
  requirePermission(PERMISSIONS.SUPPORT_UPDATE),
  supportAdminController.resolveTicket
);

adminSupportRouter.post(
  '/:ticketId/close',
  requirePermission(PERMISSIONS.SUPPORT_CLOSE),
  supportAdminController.closeTicket
);

// Read indicator
adminSupportRouter.post(
  '/:ticketId/read',
  requirePermission(PERMISSIONS.SUPPORT_READ),
  supportAdminController.markAsRead
);
