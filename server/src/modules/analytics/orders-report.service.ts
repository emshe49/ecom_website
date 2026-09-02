import mongoose from 'mongoose';
import { Order } from '../orders/order.model.js';
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from '../orders/order.constants.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  OrdersQuery,
  OrdersReportResponse,
  OrdersSummary,
  OrderTableRow,
  StatusBreakdownPoint,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class OrdersReportService {
  async getOrdersReport(query: OrdersQuery): Promise<OrdersReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'placedAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const baseFilter = this.buildBaseFilter(query, fromDate, toDate);
    const prevFilter = this.buildBaseFilter(query, prevFromDate, prevToDate);

    const [currentSummaryRaw, prevSummaryRaw, breakdownsRaw, tableData] = await Promise.all([
      this.calculateOrdersSummary(baseFilter),
      this.calculateOrdersSummary(prevFilter),
      this.calculateBreakdowns(baseFilter),
      this.calculateOrdersTable(baseFilter, page, limit, sortBy, sortOrder),
    ]);

    const summary: OrdersSummary = {
      totalOrders: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.totalOrders,
        prevSummaryRaw.totalOrders
      ),
      paidOrders: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.paidOrders,
        prevSummaryRaw.paidOrders
      ),
      cancelledOrders: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.cancelledOrders,
        prevSummaryRaw.cancelledOrders
      ),
      deliveredOrders: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.deliveredOrders,
        prevSummaryRaw.deliveredOrders
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
      breakdown: breakdownsRaw,
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

  private buildBaseFilter(query: OrdersQuery, from: Date, to: Date): Record<string, any> {
    const filter: Record<string, any> = {
      placedAt: { $gte: from, $lte: to },
    };

    if (query.status) {
      filter.status = query.status;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }
    if (query.customerId) {
      filter.userId = new mongoose.Types.ObjectId(query.customerId);
    }

    return filter;
  }

  private async calculateOrdersSummary(filter: Record<string, any>) {
    const result = await Order.aggregate([
      { $match: filter },
      {
        $project: {
          status: 1,
          paymentStatus: 1,
          fulfillmentStatus: 1,
          total: 1,
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
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          paidOrders: { $sum: { $cond: ['$isPaid', 1, 0] } },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.CANCELLED] }, 1, 0] },
          },
          deliveredOrders: {
            $sum: {
              $cond: [{ $eq: ['$fulfillmentStatus', FULFILLMENT_STATUS.DELIVERED] }, 1, 0],
            },
          },
          totalRevenue: { $sum: { $cond: ['$isPaid', '$total', 0] } },
          totalItems: { $sum: { $cond: ['$isPaid', '$itemCount', 0] } },
        },
      },
    ]);

    const row = result[0] || {
      totalOrders: 0,
      paidOrders: 0,
      cancelledOrders: 0,
      deliveredOrders: 0,
      totalRevenue: 0,
      totalItems: 0,
    };

    const averageOrderValue =
      row.paidOrders > 0
        ? Math.round(row.totalRevenue / row.paidOrders)
        : (row.totalOrders > 0 ? Math.round(row.totalRevenue / row.totalOrders) : 0);

    const averageItemsPerOrder =
      row.paidOrders > 0
        ? Number((row.totalItems / row.paidOrders).toFixed(2))
        : 0;

    return {
      totalOrders: row.totalOrders,
      paidOrders: row.paidOrders,
      cancelledOrders: row.cancelledOrders,
      deliveredOrders: row.deliveredOrders,
      averageOrderValue,
      averageItemsPerOrder,
    };
  }

  private async calculateBreakdowns(filter: Record<string, any>) {
    const [byStatusRaw, byPaymentStatusRaw, totalCount] = await Promise.all([
      Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total' },
          },
        },
      ]),
      Order.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total' },
          },
        },
      ]),
      Order.countDocuments(filter),
    ]);

    const byStatus: StatusBreakdownPoint[] = byStatusRaw.map((b) => ({
      status: b._id,
      count: b.count,
      totalAmount: b.totalAmount,
      percentage: totalCount > 0 ? Number(((b.count / totalCount) * 100).toFixed(2)) : 0,
    }));

    const byPaymentStatus: StatusBreakdownPoint[] = byPaymentStatusRaw.map((b) => ({
      status: b._id,
      count: b.count,
      totalAmount: b.totalAmount,
      percentage: totalCount > 0 ? Number(((b.count / totalCount) * 100).toFixed(2)) : 0,
    }));

    return { byStatus, byPaymentStatus };
  }

  private async calculateOrdersTable(
    filter: Record<string, any>,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 1 | -1
  ): Promise<{ items: OrderTableRow[]; totalItems: number }> {
    const totalItems = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items: OrderTableRow[] = orders.map((ord: any) => ({
      id: ord._id.toString(),
      orderNumber: ord.orderNumber,
      customerName: ord.customerSnapshot
        ? `${ord.customerSnapshot.firstName} ${ord.customerSnapshot.lastName}`.trim()
        : 'Guest',
      customerEmail: ord.customerSnapshot?.email || 'N/A',
      createdAt: (ord.placedAt || ord.createdAt).toISOString(),
      status: ord.status,
      paymentStatus: ord.paymentStatus,
      fulfillmentStatus: ord.fulfillmentStatus,
      itemCount: ord.items ? ord.items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) : 0,
      subtotal: ord.subtotal || 0,
      discountAmount: ord.discountAmount || 0,
      shippingFee: ord.shippingFee || 0,
      total: ord.total || 0,
    }));

    return { items, totalItems };
  }

  async getAllOrdersForExport(query: OrdersQuery): Promise<OrderTableRow[]> {
    const { fromDate, toDate } = analyticsDateService.resolveDateRange(query);
    const filter = this.buildBaseFilter(query, fromDate, toDate);
    const sortBy = query.sortBy || 'placedAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const data = await this.calculateOrdersTable(filter, 1, ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS, sortBy, sortOrder);
    return data.items;
  }
}

export const ordersReportService = new OrdersReportService();
