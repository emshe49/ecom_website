import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../authorization/authorization.middleware.js';
import { PERMISSIONS } from '../authorization/permissions.js';

export const analyticsRouter = Router();

// Apply authentication to all analytics routes
analyticsRouter.use(authenticate);

// 1. Sales Report
analyticsRouter.get(
  '/sales',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getSalesReport.bind(analyticsController)
);
analyticsRouter.get(
  '/sales/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportSalesReport.bind(analyticsController)
);

// 2. Orders Report
analyticsRouter.get(
  '/orders',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getOrdersReport.bind(analyticsController)
);
analyticsRouter.get(
  '/orders/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportOrdersReport.bind(analyticsController)
);

// 3. Payments Report
analyticsRouter.get(
  '/payments',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getPaymentsReport.bind(analyticsController)
);
analyticsRouter.get(
  '/payments/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportPaymentsReport.bind(analyticsController)
);

// 4. Products Report
analyticsRouter.get(
  '/products',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getProductsReport.bind(analyticsController)
);
analyticsRouter.get(
  '/products/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportProductsReport.bind(analyticsController)
);

// 5. Categories Report
analyticsRouter.get(
  '/categories',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getCategoriesReport.bind(analyticsController)
);
analyticsRouter.get(
  '/categories/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportCategoriesReport.bind(analyticsController)
);

// 6. Brands Report
analyticsRouter.get(
  '/brands',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getBrandsReport.bind(analyticsController)
);
analyticsRouter.get(
  '/brands/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportBrandsReport.bind(analyticsController)
);

// 7. Customers Report
analyticsRouter.get(
  '/customers',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getCustomersReport.bind(analyticsController)
);
analyticsRouter.get(
  '/customers/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportCustomersReport.bind(analyticsController)
);

// 8. Inventory Report
analyticsRouter.get(
  '/inventory',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getInventoryReport.bind(analyticsController)
);
analyticsRouter.get(
  '/inventory/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportInventoryReport.bind(analyticsController)
);

// 9. Returns Report
analyticsRouter.get(
  '/returns',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getReturnsReport.bind(analyticsController)
);
analyticsRouter.get(
  '/returns/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportReturnsReport.bind(analyticsController)
);

// 10. Refunds Report
analyticsRouter.get(
  '/refunds',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getRefundsReport.bind(analyticsController)
);
analyticsRouter.get(
  '/refunds/export',
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT),
  analyticsController.exportRefundsReport.bind(analyticsController)
);

// 11. Promotions Report
analyticsRouter.get(
  '/promotions',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getPromotionsReport.bind(analyticsController)
);

// 12. Shipping Report
analyticsRouter.get(
  '/shipping',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getShippingReport.bind(analyticsController)
);

// 13. Reviews Report
analyticsRouter.get(
  '/reviews',
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getReviewsReport.bind(analyticsController)
);
