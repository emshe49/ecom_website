import { Order } from '../orders/order.model.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../orders/order.constants.js';
import { Coupon } from '../promotions/coupon.model.js';
import { CouponRedemption } from '../promotions/coupon-redemption.model.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  AnalyticsBaseQuery,
  PromotionsReportResponse,
  CouponPerformanceTableRow,
  PromotionPerformanceTableRow,
} from './analytics.types.js';

export class PromotionsReportService {
  async getPromotionsReport(query: AnalyticsBaseQuery): Promise<PromotionsReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const [currentSummary, prevSummary, couponTable, promoTable] = await Promise.all([
      this.calculatePromotionSummary(fromDate, toDate),
      this.calculatePromotionSummary(prevFromDate, prevToDate),
      this.calculateCouponPerformance(fromDate, toDate),
      this.calculateAutomaticPromotionPerformance(fromDate, toDate),
    ]);

    return {
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        previousFrom: prevFromDate.toISOString(),
        previousTo: prevToDate.toISOString(),
        groupBy,
        currency: 'USD',
        generatedAt: new Date().toISOString(),
      },
      summary: {
        couponRedemptions: analyticsDateService.buildMetricComparison(
          currentSummary.couponRedemptions,
          prevSummary.couponRedemptions
        ),
        couponOrders: analyticsDateService.buildMetricComparison(
          currentSummary.couponOrders,
          prevSummary.couponOrders
        ),
        couponDiscountAmount: analyticsDateService.buildMetricComparison(
          currentSummary.couponDiscountAmount,
          prevSummary.couponDiscountAmount
        ),
        averageCouponDiscount: currentSummary.averageCouponDiscount,
        promotionOrders: analyticsDateService.buildMetricComparison(
          currentSummary.promotionOrders,
          prevSummary.promotionOrders
        ),
        promotionDiscountAmount: analyticsDateService.buildMetricComparison(
          currentSummary.promotionDiscountAmount,
          prevSummary.promotionDiscountAmount
        ),
      },
      coupons: couponTable,
      promotions: promoTable,
      pagination: {
        page: 1,
        limit: Math.max(couponTable.length, 1),
        totalItems: couponTable.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  private async calculatePromotionSummary(from: Date, to: Date) {
    const agg = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          status: { $ne: ORDER_STATUS.CANCELLED },
          paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
        },
      },
      {
        $group: {
          _id: null,
          couponOrders: {
            $sum: { $cond: [{ $gt: ['$couponDiscountAmount', 0] }, 1, 0] },
          },
          couponDiscountAmount: { $sum: { $ifNull: ['$couponDiscountAmount', 0] } },
          promotionOrders: {
            $sum: { $cond: [{ $gt: ['$promotionDiscountAmount', 0] }, 1, 0] },
          },
          promotionDiscountAmount: { $sum: { $ifNull: ['$promotionDiscountAmount', 0] } },
        },
      },
    ]);

    const row = agg[0] || {
      couponOrders: 0,
      couponDiscountAmount: 0,
      promotionOrders: 0,
      promotionDiscountAmount: 0,
    };

    const redemptionsCount = await CouponRedemption.countDocuments({
      redeemedAt: { $gte: from, $lte: to },
    });

    const averageCouponDiscount =
      row.couponOrders > 0
        ? Math.round(row.couponDiscountAmount / row.couponOrders)
        : 0;

    return {
      couponRedemptions: redemptionsCount || row.couponOrders,
      couponOrders: row.couponOrders,
      couponDiscountAmount: row.couponDiscountAmount,
      averageCouponDiscount,
      promotionOrders: row.promotionOrders,
      promotionDiscountAmount: row.promotionDiscountAmount,
    };
  }

  private async calculateCouponPerformance(from: Date, to: Date): Promise<CouponPerformanceTableRow[]> {
    const raw = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          status: { $ne: ORDER_STATUS.CANCELLED },
          'coupon.code': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            code: '$coupon.code',
            name: { $ifNull: ['$coupon.name', '$coupon.code'] },
            discountType: { $ifNull: ['$coupon.discountType', 'PERCENTAGE'] },
            discountValue: { $ifNull: ['$coupon.discountValue', 0] },
          },
          redemptions: { $sum: 1 },
          uniqueCustomersSet: { $addToSet: '$userId' },
          discountGranted: { $sum: { $ifNull: ['$couponDiscountAmount', 0] } },
          ordersRevenue: { $sum: '$total' },
        },
      },
      { $sort: { discountGranted: -1 } },
    ]);

    const results: CouponPerformanceTableRow[] = raw.map((r) => {
      const redemptions = r.redemptions || 0;
      const ordersRevenue = r.ordersRevenue || 0;
      const averageOrderValue =
        redemptions > 0 ? Math.round(ordersRevenue / redemptions) : 0;

      return {
        couponCode: r._id.code,
        name: r._id.name,
        discountType: r._id.discountType,
        discountValue: r._id.discountValue,
        redemptions,
        uniqueCustomers: r.uniqueCustomersSet ? r.uniqueCustomersSet.length : 0,
        discountGranted: r.discountGranted || 0,
        ordersRevenue,
        averageOrderValue,
      };
    });

    // Also include coupons configured with redemptions from Coupon model
    const configuredCoupons = await Coupon.find({
      $or: [
        { redemptionsCount: { $gt: 0 } },
        { createdAt: { $gte: from, $lte: to } },
      ],
    }).lean();

    configuredCoupons.forEach((c: any) => {
      if (!results.some((r) => r.couponCode === c.code)) {
        results.push({
          couponCode: c.code,
          name: c.name || c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          redemptions: c.redemptionsCount || 0,
          uniqueCustomers: c.redemptionsCount ? 1 : 0,
          discountGranted: (c.redemptionsCount || 0) * (c.discountValue || 0),
          ordersRevenue: 0,
          averageOrderValue: 0,
        });
      }
    });

    return results;
  }

  private async calculateAutomaticPromotionPerformance(
    from: Date,
    to: Date
  ): Promise<PromotionPerformanceTableRow[]> {
    const raw = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          status: { $ne: ORDER_STATUS.CANCELLED },
          'promotion.name': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            name: '$promotion.name',
            discountType: { $ifNull: ['$promotion.discountType', 'PERCENTAGE'] },
            discountValue: { $ifNull: ['$promotion.discountValue', 0] },
          },
          ordersCount: { $sum: 1 },
          discountGranted: { $sum: { $ifNull: ['$promotionDiscountAmount', 0] } },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { discountGranted: -1 } },
    ]);

    return raw.map((r) => ({
      promotionName: r._id.name,
      discountType: r._id.discountType,
      discountValue: r._id.discountValue,
      ordersCount: r.ordersCount,
      discountGranted: r.discountGranted,
      revenue: r.revenue,
    }));
  }
}

export const promotionsReportService = new PromotionsReportService();
