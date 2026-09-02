import { Order } from '../orders/order.model.js';
import { PAYMENT_STATUS } from '../orders/order.constants.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  AnalyticsBaseQuery,
  ReturnsReportResponse,
} from './analytics.types.js';

export class ReturnsReportService {
  async getReturnsReport(query: AnalyticsBaseQuery): Promise<ReturnsReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;

    // Check delivered/sold units for return rate calculation
    const [soldUnitsAgg] = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: fromDate, $lte: toDate },
          paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
        },
      },
      {
        $group: {
          _id: null,
          soldUnits: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] },
              },
            },
          },
        },
      },
    ]);

    const soldUnits = soldUnitsAgg?.soldUnits || 0;
    const returnedUnits = 0;
    const unitReturnRate = soldUnits > 0 ? Number(((returnedUnits / soldUnits) * 100).toFixed(2)) : 0;

    // Build standard return response structure
    const reasonsBreakdown = [
      { reasonCategory: 'DAMAGED', count: 0, quantity: 0, refundAmount: 0, percentage: 0 },
      { reasonCategory: 'DEFECTIVE', count: 0, quantity: 0, refundAmount: 0, percentage: 0 },
      { reasonCategory: 'WRONG_ITEM', count: 0, quantity: 0, refundAmount: 0, percentage: 0 },
      { reasonCategory: 'NOT_AS_DESCRIBED', count: 0, quantity: 0, refundAmount: 0, percentage: 0 },
      { reasonCategory: 'OTHER', count: 0, quantity: 0, refundAmount: 0, percentage: 0 },
    ];

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
        requests: analyticsDateService.buildMetricComparison(0, 0),
        approved: analyticsDateService.buildMetricComparison(0, 0),
        rejected: analyticsDateService.buildMetricComparison(0, 0),
        completed: analyticsDateService.buildMetricComparison(0, 0),
        returnedUnits,
        returnValue: 0,
        unitReturnRate,
      },
      reasonsBreakdown,
      items: [],
      pagination: {
        page,
        limit,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  async getAllReturnsForExport(query: AnalyticsBaseQuery): Promise<any[]> {
    const report = await this.getReturnsReport(query);
    return report.items;
  }
}

export const returnsReportService = new ReturnsReportService();
