import { Order } from '../orders/order.model.js';
import { PAYMENT_STATUS } from '../orders/order.constants.js';
import { Payment } from '../payments/payment.model.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  AnalyticsBaseQuery,
  RefundsReportResponse,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class RefundsReportService {
  async getRefundsReport(query: AnalyticsBaseQuery): Promise<RefundsReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [currentRefunds, prevRefunds, methodBreakdownRaw, itemsRaw] = await Promise.all([
      this.calculateRefundStats(fromDate, toDate),
      this.calculateRefundStats(prevFromDate, prevToDate),
      this.calculateMethodBreakdown(fromDate, toDate),
      this.calculateRefundsTable(fromDate, toDate, page, limit),
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
        refundCount: analyticsDateService.buildMetricComparison(
          currentRefunds.count,
          prevRefunds.count
        ),
        refundAmount: analyticsDateService.buildMetricComparison(
          currentRefunds.amount,
          prevRefunds.amount
        ),
        successfulRefunds: analyticsDateService.buildMetricComparison(
          currentRefunds.successful,
          prevRefunds.successful
        ),
        failedRefunds: analyticsDateService.buildMetricComparison(
          currentRefunds.failed,
          prevRefunds.failed
        ),
        pendingRefunds: analyticsDateService.buildMetricComparison(
          currentRefunds.pending,
          prevRefunds.pending
        ),
        averageRefundAmount: currentRefunds.averageAmount,
      },
      methodBreakdown: methodBreakdownRaw,
      failureBreakdown: [],
      items: itemsRaw.items,
      pagination: {
        page,
        limit,
        totalItems: itemsRaw.totalItems,
        totalPages: Math.ceil(itemsRaw.totalItems / limit) || 1,
        hasNextPage: page * limit < itemsRaw.totalItems,
        hasPrevPage: page > 1,
      },
    };
  }

  private async calculateRefundStats(from: Date, to: Date) {
    const agg = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          paymentStatus: { $in: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$total' },
        },
      },
    ]);

    const count = agg[0]?.count || 0;
    const amount = agg[0]?.amount || 0;
    const averageAmount = count > 0 ? Math.round(amount / count) : 0;

    return {
      count,
      amount,
      successful: count,
      failed: 0,
      pending: 0,
      averageAmount,
    };
  }

  private async calculateMethodBreakdown(from: Date, to: Date) {
    const orders = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          paymentStatus: { $in: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
        },
      },
      {
        $lookup: {
          from: Payment.collection.name,
          localField: '_id',
          foreignField: 'orderId',
          as: 'payment',
        },
      },
      { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$payment.method', 'UNKNOWN'] },
          count: { $sum: 1 },
          amount: { $sum: '$total' },
        },
      },
    ]);

    const totalAmount = orders.reduce((acc, curr) => acc + curr.amount, 0);

    return orders.map((o) => ({
      method: o._id,
      count: o.count,
      amount: o.amount,
      percentage: totalAmount > 0 ? Number(((o.amount / totalAmount) * 100).toFixed(2)) : 0,
    }));
  }

  private async calculateRefundsTable(from: Date, to: Date, page: number, limit: number) {
    const match = {
      placedAt: { $gte: from, $lte: to },
      paymentStatus: { $in: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
    };

    const totalItems = await Order.countDocuments(match);
    const orders = await Order.find(match)
      .sort({ placedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = orders.map((o: any, index: number) => ({
      id: o._id.toString(),
      refundNumber: `REF-${o.orderNumber || index + 1}`,
      orderNumber: o.orderNumber,
      amount: o.total,
      status: 'SUCCEEDED',
      method: 'ORIGINAL_PAYMENT',
      reason: 'Order Return / Cancellation Refund',
      createdAt: (o.placedAt || o.createdAt).toISOString(),
    }));

    return { items, totalItems };
  }

  async getAllRefundsForExport(query: AnalyticsBaseQuery): Promise<any[]> {
    const { fromDate, toDate } = analyticsDateService.resolveDateRange(query);
    const result = await this.calculateRefundsTable(fromDate, toDate, 1, ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS);
    return result.items;
  }
}

export const refundsReportService = new RefundsReportService();
