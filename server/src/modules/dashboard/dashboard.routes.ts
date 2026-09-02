import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/',
  requirePermission(PERMISSIONS.DASHBOARD_READ),
  dashboardController.getDashboardOverview
);

export default dashboardRouter;
