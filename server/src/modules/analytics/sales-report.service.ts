import { Order } from '../orders/order.model.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../orders/order.constants.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  AnalyticsBaseQuery,
  SalesReportResponse,
  SalesSummary,
  SalesTrendPoint,
  SalesTableRow,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class SalesReportService {
  async getSalesReport(query: AnalyticsBaseQuery): Promise<SalesReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'period';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const dateFormat = analyticsDateService.getMongoDateFormat(groupBy);

    const [currentSummaryRaw, prevSummaryRaw, trendRaw, tableData] = await Promise.all([
      this.calculateSalesSummary(fromDate, toDate),
      this.calculateSalesSummary(prevFromDate, prevToDate),
      this.calculateSalesTrend(fromDate, toDate, dateFormat),
      this.calculateSalesTable(fromDate, toDate, dateFormat, page, limit, sortBy, sortOrder),
    ]);

    const summary: SalesSummary = {
      grossRevenue: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.grossRevenue,
        prevSummaryRaw.grossRevenue
      ),
      refundAmount: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.refundAmount,
        prevSummaryRaw.refundAmount
      ),
      netRevenue: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.netRevenue,
        prevSummaryRaw.netRevenue
      ),
      discountAmount: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.discountAmount,
        prevSummaryRaw.discountAmount
      ),
      shippingRevenue: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.shippingRevenue,
        prevSummaryRaw.shippingRevenue
      ),
      orders: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.ordersCount,
        prevSummaryRaw.ordersCount
      ),
      itemsSold: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.itemsSold,
        prevSummaryRaw.itemsSold
      ),
      averageOrderValue: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.averageOrderValue,
        prevSummaryRaw.averageOrderValue
      ),
      averageItemsPerOrder: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.averageItemsPerOrder,
        prevSummaryRaw.averageItemsPerOrder
      ),
    };

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
      summary,
      trend: trendRaw,
      items: tableData.items,
      pagination: {
        page,
        limit,
        totalItems: tableData.totalItems,
        totalPages: Math.ceil(tableData.totalItems / limit) || 1,
        hasNextPage: page * limit < tableData.totalItems,
        hasPrevPage: page > 1,
      },
    };
  }

  private async calculateSalesSummary(from: Date, to: Date) {
    const result = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          status: { $ne: ORDER_STATUS.CANCELLED },
        },
      },
      {
        $project: {
          total: 1,
          discountAmount: 1,
          shippingFee: 1,
          paymentStatus: 1,
          itemCount: {
            $reduce: {
              input: '$items',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.quantity'] },
            },
          },
          isPaid: {
            $in: ['$paymentStatus', [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED]],
          },
          isRefunded: {
            $in: ['$paymentStatus', [PAYMENT_STATUS.REFUNDED]],
          },
        },
      },
      {
        $group: {
          _id: null,
          ordersCount: { $sum: 1 },
          paidCount: { $sum: { $cond: ['$isPaid', 1, 0] } },
          itemsSold: { $sum: { $cond: ['$isPaid', '$itemCount', 0] } },
          grossRevenue: { $sum: { $cond: ['$isPaid', '$total', 0] } },
          discountAmount: { $sum: { $cond: ['$isPaid', '$discountAmount', 0] } },
          shippingRevenue: { $sum: { $cond: ['$isPaid', '$shippingFee', 0] } },
          refundAmount: { $sum: { $cond: ['$isRefunded', '$total', 0] } },
        },
      },
    ]);

    const row = result[0] || {
      ordersCount: 0,
      paidCount: 0,
      itemsSold: 0,
      grossRevenue: 0,
      discountAmount: 0,
      shippingRevenue: 0,
      refundAmount: 0,
    };

    const netRevenue = Math.max(0, row.grossRevenue - row.refundAmount);
    const averageOrderValue =
      row.paidCount > 0
        ? Math.round(row.grossRevenue / row.paidCount)
        : (row.ordersCount > 0 ? Math.round(row.grossRevenue / row.ordersCount) : 0);
    const averageItemsPerOrder =
      row.paidCount > 0
        ? Number((row.itemsSold / row.paidCount).toFixed(2))
        : 0;

    return {
      ordersCount: row.ordersCount,
      paidCount: row.paidCount,
      itemsSold: row.itemsSold,
      grossRevenue: row.grossRevenue,
      discountAmount: row.discountAmount,
      shippingRevenue: row.shippingRevenue,
      refundAmount: row.refundAmount,
      netRevenue,
      averageOrderValue,
      averageItemsPerOrder,
    };
  }

  private async calculateSalesTrend(from: Date, to: Date, dateFormat: string): Promise<SalesTrendPoint[]> {
    const points = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          status: { $ne: ORDER_STATUS.CANCELLED },
        },
      },
      {
        $project: {
          placedAt: 1,
          total: 1,
          discountAmount: 1,
          shippingFee: 1,
          paymentStatus: 1,
          itemCount: {
            $reduce: {
              input: '$items',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.quantity'] },
            },
          },
          isPaid: {
            $in: ['$paymentStatus', [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED]],
          },
          isRefunded: {
            $in: ['$paymentStatus', [PAYMENT_STATUS.REFUNDED]],
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$placedAt' } },
          orderCount: { $sum: 1 },
          paidCount: { $sum: { $cond: ['$isPaid', 1, 0] } },
          itemsSold: { $sum: { $cond: ['$isPaid', '$itemCount', 0] } },
          grossRevenue: { $sum: { $cond: ['$isPaid', '$total', 0] } },
          discountAmount: { $sum: { $cond: ['$isPaid', '$discountAmount', 0] } },
          shippingRevenue: { $sum: { $cond: ['$isPaid', '$shippingFee', 0] } },
          refundAmount: { $sum: { $cond: ['$isRefunded', '$total', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return points.map((p) => {
      const netRevenue = Math.max(0, p.grossRevenue - p.refundAmount);
      const averageOrderValue =
        p.paidCount > 0
          ? Math.round(p.grossRevenue / p.paidCount)
          : (p.orderCount > 0 ? Math.round(p.grossRevenue / p.orderCount) : 0);

      return {
        period: p._id,
        grossRevenue: p.grossRevenue,
        refundAmount: p.refundAmount,
        netRevenue,
        discountAmount: p.discountAmount,
        shippingRevenue: p.shippingRevenue,
        orderCount: p.orderCount,
        itemsSold: p.itemsSold,
        averageOrderValue,
      };
    });
  }

  private async calculateSalesTable(
    from: Date,
    to: Date,
    dateFormat: string,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 1 | -1
  ): Promise<{ items: SalesTableRow[]; totalItems: number }> {
    const pipeline: any[] = [
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          status: { $ne: ORDER_STATUS.CANCELLED },
        },
      },
      {
        $project: {
          placedAt: 1,
          total: 1,
          discountAmount: 1,
          shippingFee: 1,
          paymentStatus: 1,
          itemCount: {
            $reduce: {
              input: '$items',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.quantity'] },
            },
          },
          isPaid: {
            $in: ['$paymentStatus', [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED]],
          },
          isRefunded: {
            $in: ['$paymentStatus', [PAYMENT_STATUS.REFUNDED]],
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$placedAt' } },
          ordersCount: { $sum: 1 },
          paidCount: { $sum: { $cond: ['$isPaid', 1, 0] } },
          itemsSold: { $sum: { $cond: ['$isPaid', '$itemCount', 0] } },
          grossRevenue: { $sum: { $cond: ['$isPaid', '$total', 0] } },
          discountAmount: { $sum: { $cond: ['$isPaid', '$discountAmount', 0] } },
          shippingRevenue: { $sum: { $cond: ['$isPaid', '$shippingFee', 0] } },
          refundAmount: { $sum: { $cond: ['$isRefunded', '$total', 0] } },
        },
      },
      {
        $project: {
          period: '$_id',
          ordersCount: 1,
          paidCount: 1,
          itemsSold: 1,
          grossRevenue: 1,
          discountAmount: 1,
          refundAmount: 1,
          netRevenue: { $max: [0, { $subtract: ['$grossRevenue', '$refundAmount'] }] },
          averageOrderValue: {
            $cond: [
              { $gt: ['$paidCount', 0] },
              { $round: [{ $divide: ['$grossRevenue', '$paidCount'] }, 0] },
              {
                $cond: [
                  { $gt: ['$ordersCount', 0] },
                  { $round: [{ $divide: ['$grossRevenue', '$ordersCount'] }, 0] },
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $sort: { [sortBy]: sortOrder } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
        },
      },
    ];

    const result = await Order.aggregate(pipeline);
    const totalItems = result[0]?.metadata[0]?.total || 0;
    const rawData = result[0]?.data || [];

    const items: SalesTableRow[] = rawData.map((d: any) => ({
      period: d.period,
      ordersCount: d.ordersCount,
      itemsSold: d.itemsSold,
      grossRevenue: d.grossRevenue,
      discountAmount: d.discountAmount,
      refundAmount: d.refundAmount,
      netRevenue: d.netRevenue,
      averageOrderValue: d.averageOrderValue,
    }));

    return { items, totalItems };
  }

  async getAllSalesForExport(query: AnalyticsBaseQuery): Promise<SalesTableRow[]> {
    const { fromDate, toDate, groupBy } = analyticsDateService.resolveDateRange(query);
    const dateFormat = analyticsDateService.getMongoDateFormat(groupBy);
    const sortBy = query.sortBy || 'period';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const data = await this.calculateSalesTable(fromDate, toDate, dateFormat, 1, ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS, sortBy, sortOrder);
    return data.items;
  }
}

export const salesReportService = new SalesReportService();
