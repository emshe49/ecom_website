import { Order } from '../orders/order.model.js';
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from '../orders/order.constants.js';
import { Payment } from '../payments/payment.model.js';
import { PAYMENT_STATUS as PAY_STATUS } from '../payments/payment.constants.js';
import { User } from '../users/user.model.js';
import { ROLES } from '../authorization/roles.js';
import { Inventory } from '../inventory/inventory.model.js';
import { Product } from '../catalog/products/product.model.js';
import { ProductVariant } from '../catalog/products/product-variant.model.js';
import { PRODUCT_STATUS } from '../catalog/products/product.constants.js';
import { Review } from '../reviews/review.model.js';
import { REVIEW_STATUS } from '../reviews/review.constants.js';
import { Promotion } from '../promotions/promotion.model.js';
import { Coupon } from '../promotions/coupon.model.js';
import { CouponRedemption } from '../promotions/coupon-redemption.model.js';
import { Shipment } from '../shipping/shipment.model.js';
import { SHIPMENT_STATUS } from '../shipping/shipping.constants.js';
import {
  DashboardQueryParams,
  DashboardResponse,
  DashboardKpis,
  DashboardBreakdowns,
  TimeseriesPoint,
  ActionItem,
  LowStockAlert,
  RecentOrderSummary,
  CatalogSummary,
} from './dashboard.types.js';
import { DASHBOARD_CONSTANTS, DASHBOARD_INTERVAL, DashboardInterval } from './dashboard.constants.js';

export class DashboardQueryService {
  /**
   * Main query method to aggregate and return the full operational admin dashboard
   */
  async getDashboardOverview(query: DashboardQueryParams): Promise<DashboardResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, interval } =
      this.resolveDateRanges(query);

    const [
      kpis,
      breakdowns,
      trends,
      operations,
      catalogSummary,
    ] = await Promise.all([
      this.calculateKpis(fromDate, toDate, prevFromDate, prevToDate),
      this.calculateBreakdowns(fromDate, toDate),
      this.calculateTrends(fromDate, toDate, interval),
      this.calculateOperations(fromDate, toDate),
      this.calculateCatalogSummary(fromDate, toDate),
    ]);

    return {
      meta: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        previousFrom: prevFromDate.toISOString(),
        previousTo: prevToDate.toISOString(),
        interval,
        currency: 'USD',
        generatedAt: new Date().toISOString(),
      },
      kpis,
      breakdowns,
      trends,
      operations,
      catalogSummary,
    };
  }

  /**
   * Resolves current and previous period date boundaries based on inputs
   */
  private resolveDateRanges(query: DashboardQueryParams) {
    const toDate = query.to ? new Date(query.to) : new Date();
    const fromDate = query.from
      ? new Date(query.from)
      : new Date(toDate.getTime() - DASHBOARD_CONSTANTS.DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

    const durationMs = toDate.getTime() - fromDate.getTime();
    const prevToDate = new Date(fromDate.getTime());
    const prevFromDate = new Date(fromDate.getTime() - durationMs);
    const interval: DashboardInterval = query.interval || DASHBOARD_INTERVAL.DAY;

    return { fromDate, toDate, prevFromDate, prevToDate, interval };
  }

  /**
   * Computes store KPIs with previous-period comparisons
   */
  private async calculateKpis(
    fromDate: Date,
    toDate: Date,
    prevFromDate: Date,
    prevToDate: Date
  ): Promise<DashboardKpis> {
    const [
      currentOrderStats,
      prevOrderStats,
      currentCustomerStats,
      prevCustomerStats,
      pendingFulfillmentCount,
      inventoryStats,
    ] = await Promise.all([
      this.getOrderStatsForPeriod(fromDate, toDate),
      this.getOrderStatsForPeriod(prevFromDate, prevToDate),
      this.getCustomerStatsForPeriod(fromDate, toDate),
      this.getCustomerStatsForPeriod(prevFromDate, prevToDate),
      this.getPendingFulfillmentCount(),
      this.getInventoryCounts(),
    ]);

    const currentAov =
      currentOrderStats.paidCount > 0
        ? Math.round(currentOrderStats.revenue / currentOrderStats.paidCount)
        : (currentOrderStats.count > 0 ? Math.round(currentOrderStats.revenue / currentOrderStats.count) : 0);
    const prevAov =
      prevOrderStats.paidCount > 0
        ? Math.round(prevOrderStats.revenue / prevOrderStats.paidCount)
        : (prevOrderStats.count > 0 ? Math.round(prevOrderStats.revenue / prevOrderStats.count) : 0);

    return {
      revenue: {
        current: currentOrderStats.revenue,
        previous: prevOrderStats.revenue,
        changePercentage: this.calculatePercentageChange(
          currentOrderStats.revenue,
          prevOrderStats.revenue
        ),
      },
      orders: {
        current: currentOrderStats.count,
        previous: prevOrderStats.count,
        changePercentage: this.calculatePercentageChange(
          currentOrderStats.count,
          prevOrderStats.count
        ),
      },
      averageOrderValue: {
        current: currentAov,
        previous: prevAov,
        changePercentage: this.calculatePercentageChange(currentAov, prevAov),
      },
      newCustomers: {
        current: currentCustomerStats.count,
        previous: prevCustomerStats.count,
        changePercentage: this.calculatePercentageChange(
          currentCustomerStats.count,
          prevCustomerStats.count
        ),
      },
      pendingFulfillment: {
        current: pendingFulfillmentCount,
      },
      lowStockCount: {
        current: inventoryStats.lowStockCount,
      },
      outOfStockCount: {
        current: inventoryStats.outOfStockCount,
      },
    };
  }

  /**
   * Helper to fetch revenue and order count for a specific date window
   */
  private async getOrderStatsForPeriod(fromDate: Date, toDate: Date) {
    const result = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: fromDate, $lte: toDate },
          status: { $ne: ORDER_STATUS.CANCELLED },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          paidCount: {
            $sum: {
              $cond: [
                { $in: ['$paymentStatus', [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED]] },
                1,
                0,
              ],
            },
          },
          revenue: {
            $sum: {
              $cond: [
                { $in: ['$paymentStatus', [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED]] },
                '$total',
                0,
              ],
            },
          },
        },
      },
    ]);

    return {
      count: result[0]?.count || 0,
      paidCount: result[0]?.paidCount || 0,
      revenue: result[0]?.revenue || 0,
    };
  }

  /**
   * Helper to fetch customer registrations for a period
   */
  private async getCustomerStatsForPeriod(fromDate: Date, toDate: Date) {
    const count = await User.countDocuments({
      role: ROLES.CUSTOMER,
      createdAt: { $gte: fromDate, $lte: toDate },
    });
    return { count };
  }

  /**
   * Calculates pending fulfillment orders count
   */
  private async getPendingFulfillmentCount(): Promise<number> {
    return Order.countDocuments({
      status: {
        $in: [
          ORDER_STATUS.PLACED,
          ORDER_STATUS.CONFIRMED,
          ORDER_STATUS.PROCESSING,
          ORDER_STATUS.READY_TO_SHIP,
        ],
      },
      fulfillmentStatus: {
        $in: [FULFILLMENT_STATUS.UNFULFILLED, FULFILLMENT_STATUS.PROCESSING],
      },
    });
  }

  /**
   * Calculates low stock and out of stock counts
   */
  private async getInventoryCounts() {
    const stats = await Inventory.aggregate([
      {
        $project: {
          available: { $subtract: ['$onHand', '$reserved'] },
          lowStockThreshold: 1,
        },
      },
      {
        $group: {
          _id: null,
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$available', 0] },
                    { $lte: ['$available', '$lowStockThreshold'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $lte: ['$available', 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    return {
      lowStockCount: stats[0]?.lowStockCount || 0,
      outOfStockCount: stats[0]?.outOfStockCount || 0,
    };
  }

  /**
   * Computes operational breakdowns by Order status, Payment status, Fulfillment, and Payment Method
   */
  private async calculateBreakdowns(
    fromDate: Date,
    toDate: Date
  ): Promise<DashboardBreakdowns> {
    const [
      ordersByStatusRaw,
      ordersByPaymentStatusRaw,
      ordersByFulfillmentStatusRaw,
      paymentsByMethodRaw,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { placedAt: { $gte: fromDate, $lte: toDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { placedAt: { $gte: fromDate, $lte: toDate } } },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { placedAt: { $gte: fromDate, $lte: toDate } } },
        {
          $group: {
            _id: '$fulfillmentStatus',
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: fromDate, $lte: toDate } } },
        {
          $group: {
            _id: '$method',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    return {
      ordersByStatus: ordersByStatusRaw.map((item) => ({
        status: item._id,
        count: item.count,
        totalAmount: item.totalAmount,
      })),
      ordersByPaymentStatus: ordersByPaymentStatusRaw.map((item) => ({
        status: item._id,
        count: item.count,
        totalAmount: item.totalAmount,
      })),
      ordersByFulfillmentStatus: ordersByFulfillmentStatusRaw.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      paymentsByMethod: paymentsByMethodRaw.map((item) => ({
        method: item._id,
        count: item.count,
        totalAmount: item.totalAmount,
      })),
    };
  }

  /**
   * Computes timeseries trend data for chart rendering
   */
  private async calculateTrends(
    fromDate: Date,
    toDate: Date,
    interval: DashboardInterval
  ): Promise<{ timeseries: TimeseriesPoint[] }> {
    let dateFormat = '%Y-%m-%d';
    if (interval === DASHBOARD_INTERVAL.MONTH) {
      dateFormat = '%Y-%m';
    } else if (interval === DASHBOARD_INTERVAL.WEEK) {
      dateFormat = '%Y-W%V';
    }

    const points = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: fromDate, $lte: toDate },
          status: { $ne: ORDER_STATUS.CANCELLED },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$placedAt' },
          },
          ordersCount: { $sum: 1 },
          paidCount: {
            $sum: {
              $cond: [
                { $in: ['$paymentStatus', [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED]] },
                1,
                0,
              ],
            },
          },
          revenue: {
            $sum: {
              $cond: [
                { $in: ['$paymentStatus', [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED]] },
                '$total',
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const timeseries: TimeseriesPoint[] = points.map((p) => ({
      date: p._id,
      revenue: p.revenue,
      ordersCount: p.ordersCount,
      averageOrderValue:
        p.paidCount > 0
          ? Math.round(p.revenue / p.paidCount)
          : (p.ordersCount > 0 ? Math.round(p.revenue / p.ordersCount) : 0),
    }));

    return { timeseries };
  }

  /**
   * Computes operational alerts, low stock variants, and recent orders
   */
  private async calculateOperations(fromDate: Date, toDate: Date) {
    const [
      pendingFulfillmentCount,
      lowStockAlerts,
      recentOrdersRaw,
      failedPaymentsCount,
      unfulfilledShipmentsCount,
    ] = await Promise.all([
      this.getPendingFulfillmentCount(),
      this.getLowStockAlerts(),
      this.getRecentOrders(),
      Payment.countDocuments({
        status: PAY_STATUS.FAILED,
        createdAt: { $gte: fromDate, $lte: toDate },
      }),
      Shipment.countDocuments({
        status: {
          $in: [
            SHIPMENT_STATUS.PENDING,
            SHIPMENT_STATUS.READY_TO_SHIP,
            SHIPMENT_STATUS.IN_TRANSIT,
          ],
        },
      }),
    ]);

    const actionItems: ActionItem[] = [];

    if (pendingFulfillmentCount > 0) {
      actionItems.push({
        type: 'PENDING_ORDER',
        message: `${pendingFulfillmentCount} order(s) awaiting fulfillment`,
        count: pendingFulfillmentCount,
        severity: pendingFulfillmentCount > 10 ? 'HIGH' : 'MEDIUM',
        actionUrl: '/admin/orders?fulfillmentStatus=UNFULFILLED',
      });
    }

    if (lowStockAlerts.length > 0) {
      actionItems.push({
        type: 'LOW_STOCK',
        message: `${lowStockAlerts.length} variant(s) are low or out of stock`,
        count: lowStockAlerts.length,
        severity: lowStockAlerts.some((a) => a.available <= 0) ? 'HIGH' : 'MEDIUM',
        actionUrl: '/admin/inventory?filter=low-stock',
      });
    }

    if (failedPaymentsCount > 0) {
      actionItems.push({
        type: 'FAILED_PAYMENT',
        message: `${failedPaymentsCount} payment(s) failed in selected period`,
        count: failedPaymentsCount,
        severity: 'MEDIUM',
        actionUrl: '/admin/payments?status=FAILED',
      });
    }

    if (unfulfilledShipmentsCount > 0) {
      actionItems.push({
        type: 'UNFULFILLED_SHIPMENT',
        message: `${unfulfilledShipmentsCount} shipment(s) pending carrier handover`,
        count: unfulfilledShipmentsCount,
        severity: 'MEDIUM',
        actionUrl: '/admin/shipments?status=PENDING',
      });
    }

    const recentOrders: RecentOrderSummary[] = recentOrdersRaw.map((ord) => ({
      id: ord._id.toString(),
      orderNumber: ord.orderNumber,
      customerName: ord.customerSnapshot
        ? `${ord.customerSnapshot.firstName} ${ord.customerSnapshot.lastName}`.trim()
        : 'Guest',
      customerEmail: ord.customerSnapshot?.email || 'N/A',
      total: ord.total,
      status: ord.status,
      paymentStatus: ord.paymentStatus,
      fulfillmentStatus: ord.fulfillmentStatus,
      itemCount: ord.items ? ord.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) : 0,
      placedAt: (ord.placedAt || ord.createdAt).toISOString(),
    }));

    return {
      actionItems,
      lowStockAlerts,
      recentOrders,
    };
  }

  /**
   * Fetches low stock items with product and variant details
   */
  private async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const items = await Inventory.aggregate([
      {
        $project: {
          variantId: 1,
          onHand: 1,
          reserved: 1,
          lowStockThreshold: 1,
          available: { $subtract: ['$onHand', '$reserved'] },
        },
      },
      {
        $match: {
          $expr: { $lte: ['$available', '$lowStockThreshold'] },
        },
      },
      { $sort: { available: 1 } },
      { $limit: DASHBOARD_CONSTANTS.LOW_STOCK_LIMIT },
      {
        $lookup: {
          from: ProductVariant.collection.name,
          localField: 'variantId',
          foreignField: '_id',
          as: 'variant',
        },
      },
      { $unwind: { path: '$variant', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: Product.collection.name,
          localField: 'variant.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    ]);

    return items.map((item) => ({
      variantId: item.variantId.toString(),
      sku: item.variant?.sku || 'UNKNOWN',
      productName: item.product?.name || item.variant?.name || 'Product Variant',
      onHand: item.onHand,
      reserved: item.reserved,
      available: item.available,
      lowStockThreshold: item.lowStockThreshold,
    }));
  }

  /**
   * Fetches the latest placed orders
   */
  private async getRecentOrders() {
    return Order.find()
      .sort({ placedAt: -1, createdAt: -1 })
      .limit(DASHBOARD_CONSTANTS.RECENT_ORDERS_LIMIT)
      .lean();
  }

  /**
   * Aggregates catalog stats (products, reviews, promotions, coupons)
   */
  private async calculateCatalogSummary(
    fromDate: Date,
    toDate: Date
  ): Promise<CatalogSummary> {
    const now = new Date();

    const [
      totalProducts,
      publishedProducts,
      draftProducts,
      reviewStats,
      activePromotionsCount,
      activeCouponsCount,
      totalCouponRedemptionsInPeriod,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: PRODUCT_STATUS.ACTIVE }),
      Product.countDocuments({ status: PRODUCT_STATUS.DRAFT }),
      Review.aggregate([
        { $match: { status: REVIEW_STATUS.PUBLISHED } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
      Promotion.countDocuments({
        active: true,
        $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
        $and: [{ $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
      }),
      Coupon.countDocuments({
        active: true,
        $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
        $and: [{ $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
      }),
      CouponRedemption.countDocuments({
        redeemedAt: { $gte: fromDate, $lte: toDate },
      }),
    ]);

    return {
      totalProducts,
      publishedProducts,
      draftProducts,
      totalReviews: reviewStats[0]?.totalReviews || 0,
      averageReviewRating: reviewStats[0]?.avgRating
        ? Number(reviewStats[0].avgRating.toFixed(2))
        : 0,
      activePromotionsCount,
      activeCouponsCount,
      totalCouponRedemptionsInPeriod,
    };
  }

  /**
   * Percentage calculation with zero protection
   */
  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }
}

export const dashboardQueryService = new DashboardQueryService();
