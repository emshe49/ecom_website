import { Request, Response, NextFunction } from 'express';
import { salesReportService } from './sales-report.service.js';
import { ordersReportService } from './orders-report.service.js';
import { paymentsReportService } from './payments-report.service.js';
import { productsReportService } from './products-report.service.js';
import { categoriesReportService } from './categories-report.service.js';
import { brandsReportService } from './brands-report.service.js';
import { customersReportService } from './customers-report.service.js';
import { inventoryReportService } from './inventory-report.service.js';
import { returnsReportService } from './returns-report.service.js';
import { refundsReportService } from './refunds-report.service.js';
import { promotionsReportService } from './promotions-report.service.js';
import { shippingReportService } from './shipping-report.service.js';
import { reviewsReportService } from './reviews-report.service.js';
import { csvExportService } from './csv-export.service.js';
import {
  salesQuerySchema,
  ordersQuerySchema,
  paymentsQuerySchema,
  productsQuerySchema,
  categoriesQuerySchema,
  brandsQuerySchema,
  customersQuerySchema,
  inventoryQuerySchema,
  returnsQuerySchema,
  refundsQuerySchema,
  promotionsQuerySchema,
  shippingQuerySchema,
  reviewsQuerySchema,
} from './analytics.validation.js';

export class AnalyticsController {
  // 1. Sales Report
  async getSalesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = salesQuerySchema.parse(req.query);
      const report = await salesReportService.getSalesReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportSalesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = salesQuerySchema.parse(req.query);
      const rows = await salesReportService.getAllSalesForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'sales_report',
        [
          { header: 'Period', accessor: (r) => r.period },
          { header: 'Orders Count', accessor: (r) => r.ordersCount },
          { header: 'Items Sold', accessor: (r) => r.itemsSold },
          { header: 'Gross Revenue ($)', accessor: (r) => (r.grossRevenue / 100).toFixed(2) },
          { header: 'Discount ($)', accessor: (r) => (r.discountAmount / 100).toFixed(2) },
          { header: 'Refunds ($)', accessor: (r) => (r.refundAmount / 100).toFixed(2) },
          { header: 'Net Revenue ($)', accessor: (r) => (r.netRevenue / 100).toFixed(2) },
          { header: 'AOV ($)', accessor: (r) => (r.averageOrderValue / 100).toFixed(2) },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 2. Orders Report
  async getOrdersReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = ordersQuerySchema.parse(req.query);
      const report = await ordersReportService.getOrdersReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportOrdersReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = ordersQuerySchema.parse(req.query);
      const rows = await ordersReportService.getAllOrdersForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'orders_report',
        [
          { header: 'Order Number', accessor: (r) => r.orderNumber },
          { header: 'Customer', accessor: (r) => r.customerName },
          { header: 'Email', accessor: (r) => r.customerEmail },
          { header: 'Placed At', accessor: (r) => r.createdAt },
          { header: 'Status', accessor: (r) => r.status },
          { header: 'Payment Status', accessor: (r) => r.paymentStatus },
          { header: 'Fulfillment Status', accessor: (r) => r.fulfillmentStatus },
          { header: 'Items Count', accessor: (r) => r.itemCount },
          { header: 'Subtotal ($)', accessor: (r) => (r.subtotal / 100).toFixed(2) },
          { header: 'Discount ($)', accessor: (r) => (r.discountAmount / 100).toFixed(2) },
          { header: 'Shipping Fee ($)', accessor: (r) => (r.shippingFee / 100).toFixed(2) },
          { header: 'Total ($)', accessor: (r) => (r.total / 100).toFixed(2) },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 3. Payments Report
  async getPaymentsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = paymentsQuerySchema.parse(req.query);
      const report = await paymentsReportService.getPaymentsReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportPaymentsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = paymentsQuerySchema.parse(req.query);
      const rows = await paymentsReportService.getAllPaymentsForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'payments_report',
        [
          { header: 'Payment #', accessor: (r) => r.paymentNumber },
          { header: 'Order #', accessor: (r) => r.orderNumber },
          { header: 'Amount ($)', accessor: (r) => (r.amount / 100).toFixed(2) },
          { header: 'Currency', accessor: (r) => r.currency },
          { header: 'Method', accessor: (r) => r.method },
          { header: 'Status', accessor: (r) => r.status },
          { header: 'Provider', accessor: (r) => r.provider },
          { header: 'Created At', accessor: (r) => r.createdAt },
          { header: 'Paid At', accessor: (r) => r.paidAt || 'N/A' },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 4. Products Report
  async getProductsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = productsQuerySchema.parse(req.query);
      const report = await productsReportService.getProductsReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportProductsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = productsQuerySchema.parse(req.query);
      const rows = await productsReportService.getAllProductsForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'products_report',
        [
          { header: 'Product Name', accessor: (r) => r.productName },
          { header: 'Slug', accessor: (r) => r.slug },
          { header: 'Units Sold', accessor: (r) => r.unitsSold },
          { header: 'Orders Count', accessor: (r) => r.ordersCount },
          { header: 'Gross Revenue ($)', accessor: (r) => (r.grossRevenue / 100).toFixed(2) },
          { header: 'Discount ($)', accessor: (r) => (r.discountAllocated / 100).toFixed(2) },
          { header: 'Refunds ($)', accessor: (r) => (r.refundAmount / 100).toFixed(2) },
          { header: 'Net Revenue ($)', accessor: (r) => (r.netRevenue / 100).toFixed(2) },
          { header: 'Average Rating', accessor: (r) => r.averageRating.toFixed(1) },
          { header: 'Return Rate (%)', accessor: (r) => `${r.returnRate}%` },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 5. Categories Report
  async getCategoriesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = categoriesQuerySchema.parse(req.query);
      const report = await categoriesReportService.getCategoriesReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportCategoriesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = categoriesQuerySchema.parse(req.query);
      const rows = await categoriesReportService.getAllCategoriesForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'categories_report',
        [
          { header: 'Category Name', accessor: (r) => r.categoryName },
          { header: 'Slug', accessor: (r) => r.slug },
          { header: 'Units Sold', accessor: (r) => r.unitsSold },
          { header: 'Orders Count', accessor: (r) => r.ordersCount },
          { header: 'Gross Revenue ($)', accessor: (r) => (r.grossRevenue / 100).toFixed(2) },
          { header: 'Discount ($)', accessor: (r) => (r.discountAmount / 100).toFixed(2) },
          { header: 'Refunds ($)', accessor: (r) => (r.refundAmount / 100).toFixed(2) },
          { header: 'Net Revenue ($)', accessor: (r) => (r.netRevenue / 100).toFixed(2) },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 6. Brands Report
  async getBrandsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = brandsQuerySchema.parse(req.query);
      const report = await brandsReportService.getBrandsReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportBrandsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = brandsQuerySchema.parse(req.query);
      const rows = await brandsReportService.getAllBrandsForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'brands_report',
        [
          { header: 'Brand Name', accessor: (r) => r.brandName },
          { header: 'Slug', accessor: (r) => r.slug },
          { header: 'Products Sold', accessor: (r) => r.productsSold },
          { header: 'Units Sold', accessor: (r) => r.unitsSold },
          { header: 'Gross Revenue ($)', accessor: (r) => (r.grossRevenue / 100).toFixed(2) },
          { header: 'Refunds ($)', accessor: (r) => (r.refundAmount / 100).toFixed(2) },
          { header: 'Net Revenue ($)', accessor: (r) => (r.netRevenue / 100).toFixed(2) },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 7. Customers Report
  async getCustomersReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = customersQuerySchema.parse(req.query);
      const report = await customersReportService.getCustomersReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportCustomersReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = customersQuerySchema.parse(req.query);
      const rows = await customersReportService.getAllCustomersForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'customers_report',
        [
          { header: 'Customer Name', accessor: (r) => r.displayName },
          { header: 'Email', accessor: (r) => r.email || 'N/A' },
          { header: 'Joined At', accessor: (r) => r.joinedAt },
          { header: 'Orders Count', accessor: (r) => r.ordersCount },
          { header: 'Total Spend ($)', accessor: (r) => (r.totalSpend / 100).toFixed(2) },
          { header: 'AOV ($)', accessor: (r) => (r.averageOrderValue / 100).toFixed(2) },
          { header: 'Last Order At', accessor: (r) => r.lastOrderAt || 'Never' },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 8. Inventory Report
  async getInventoryReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = inventoryQuerySchema.parse(req.query);
      const report = await inventoryReportService.getInventoryReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportInventoryReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = inventoryQuerySchema.parse(req.query);
      const rows = await inventoryReportService.getAllInventoryForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'inventory_report',
        [
          { header: 'SKU', accessor: (r) => r.sku },
          { header: 'Product Name', accessor: (r) => r.productName },
          { header: 'Variant', accessor: (r) => r.variantName || 'Standard' },
          { header: 'Stock In', accessor: (r) => r.stockIn },
          { header: 'Sold', accessor: (r) => r.sold },
          { header: 'Adjustments', accessor: (r) => r.adjustments },
          { header: 'On Hand', accessor: (r) => r.currentOnHand },
          { header: 'Reserved', accessor: (r) => r.reserved },
          { header: 'Available', accessor: (r) => r.available },
          { header: 'Threshold', accessor: (r) => r.lowStockThreshold },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 9. Returns Report
  async getReturnsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = returnsQuerySchema.parse(req.query);
      const report = await returnsReportService.getReturnsReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportReturnsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = returnsQuerySchema.parse(req.query);
      const rows = await returnsReportService.getAllReturnsForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'returns_report',
        [
          { header: 'Return Number', accessor: (r) => r.returnNumber },
          { header: 'Order Number', accessor: (r) => r.orderNumber },
          { header: 'Customer', accessor: (r) => r.customerName },
          { header: 'Status', accessor: (r) => r.status },
          { header: 'Reason', accessor: (r) => r.reasonCategory },
          { header: 'Units', accessor: (r) => r.units },
          { header: 'Refund Amount ($)', accessor: (r) => (r.refundAmount / 100).toFixed(2) },
          { header: 'Created At', accessor: (r) => r.createdAt },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 10. Refunds Report
  async getRefundsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = refundsQuerySchema.parse(req.query);
      const report = await refundsReportService.getRefundsReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async exportRefundsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = refundsQuerySchema.parse(req.query);
      const rows = await refundsReportService.getAllRefundsForExport(query);
      csvExportService.streamCsvToResponse(
        res,
        'refunds_report',
        [
          { header: 'Refund Number', accessor: (r) => r.refundNumber },
          { header: 'Order Number', accessor: (r) => r.orderNumber },
          { header: 'Amount ($)', accessor: (r) => (r.amount / 100).toFixed(2) },
          { header: 'Status', accessor: (r) => r.status },
          { header: 'Method', accessor: (r) => r.method },
          { header: 'Reason', accessor: (r) => r.reason },
          { header: 'Created At', accessor: (r) => r.createdAt },
        ],
        rows
      );
    } catch (err) {
      next(err);
    }
  }

  // 11. Promotions Report
  async getPromotionsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = promotionsQuerySchema.parse(req.query);
      const report = await promotionsReportService.getPromotionsReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  // 12. Shipping Report
  async getShippingReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = shippingQuerySchema.parse(req.query);
      const report = await shippingReportService.getShippingReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  // 13. Reviews Report
  async getReviewsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = reviewsQuerySchema.parse(req.query);
      const report = await reviewsReportService.getReviewsReport(query);
      res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
