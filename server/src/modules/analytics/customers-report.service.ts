import { User } from '../users/user.model.js';
import { ROLES } from '../authorization/roles.js';
import { Order } from '../orders/order.model.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../orders/order.constants.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  CustomersQuery,
  CustomersReportResponse,
  CustomersSummary,
  CustomerTableRow,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class CustomersReportService {
  async getCustomersReport(query: CustomersQuery): Promise<CustomersReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'totalSpend';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const dateFormat = analyticsDateService.getMongoDateFormat(groupBy);

    const [currentSummaryRaw, prevSummaryRaw, trendRaw, tableData] = await Promise.all([
      this.calculateCustomersSummary(fromDate, toDate),
      this.calculateCustomersSummary(prevFromDate, prevToDate),
      this.calculateRegistrationTrend(fromDate, toDate, dateFormat),
      this.calculateCustomersTable(fromDate, toDate, query.search, page, limit, sortBy, sortOrder),
    ]);

    const summary: CustomersSummary = {
      totalCustomers: currentSummaryRaw.totalCustomers,
      newCustomers: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.newCustomers,
        prevSummaryRaw.newCustomers
      ),
      customersWithOrders: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.customersWithOrders,
        prevSummaryRaw.customersWithOrders
      ),
      repeatCustomers: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.repeatCustomers,
        prevSummaryRaw.repeatCustomers
      ),
      repeatCustomerRate: currentSummaryRaw.repeatCustomerRate,
      averageOrdersPerCustomer: currentSummaryRaw.averageOrdersPerCustomer,
      averageCustomerSpend: currentSummaryRaw.averageCustomerSpend,
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
      repeatDefinition:
        'A repeat customer is defined as a customer with >= 2 non-cancelled paid Orders.',
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

  private async calculateCustomersSummary(from: Date, to: Date) {
    const [totalCustomers, newCustomers, orderStats] = await Promise.all([
      User.countDocuments({ role: ROLES.CUSTOMER }),
      User.countDocuments({
        role: ROLES.CUSTOMER,
        createdAt: { $gte: from, $lte: to },
      }),
      Order.aggregate([
        {
          $match: {
            placedAt: { $gte: from, $lte: to },
            status: { $ne: ORDER_STATUS.CANCELLED },
            paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
          },
        },
        {
          $group: {
            _id: '$userId',
            ordersCount: { $sum: 1 },
            spend: { $sum: '$total' },
          },
        },
        {
          $group: {
            _id: null,
            customersWithOrders: { $sum: 1 },
            repeatCustomers: {
              $sum: { $cond: [{ $gte: ['$ordersCount', 2] }, 1, 0] },
            },
            totalOrders: { $sum: '$ordersCount' },
            totalSpend: { $sum: '$spend' },
          },
        },
      ]),
    ]);

    const stats = orderStats[0] || {
      customersWithOrders: 0,
      repeatCustomers: 0,
      totalOrders: 0,
      totalSpend: 0,
    };

    const repeatCustomerRate =
      stats.customersWithOrders > 0
        ? Number(((stats.repeatCustomers / stats.customersWithOrders) * 100).toFixed(2))
        : 0;

    const averageOrdersPerCustomer =
      stats.customersWithOrders > 0
        ? Number((stats.totalOrders / stats.customersWithOrders).toFixed(2))
        : 0;

    const averageCustomerSpend =
      stats.customersWithOrders > 0
        ? Math.round(stats.totalSpend / stats.customersWithOrders)
        : 0;

    return {
      totalCustomers,
      newCustomers,
      customersWithOrders: stats.customersWithOrders,
      repeatCustomers: stats.repeatCustomers,
      repeatCustomerRate,
      averageOrdersPerCustomer,
      averageCustomerSpend,
    };
  }

  private async calculateRegistrationTrend(from: Date, to: Date, dateFormat: string) {
    const points = await User.aggregate([
      {
        $match: {
          role: ROLES.CUSTOMER,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          newCustomers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return points.map((p) => ({
      period: p._id,
      newCustomers: p.newCustomers,
    }));
  }

  private async calculateCustomersTable(
    from: Date,
    to: Date,
    search: string | undefined,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 1 | -1
  ): Promise<{ items: CustomerTableRow[]; totalItems: number }> {
    const userMatch: Record<string, any> = { role: ROLES.CUSTOMER };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      userMatch['$or'] = [
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const pipeline: any[] = [
      { $match: userMatch },
      {
        $lookup: {
          from: Order.collection.name,
          let: { uId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$uId'] },
                    { $ne: ['$status', ORDER_STATUS.CANCELLED] },
                    {
                      $in: [
                        '$paymentStatus',
                        [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED],
                      ],
                    },
                    { $gte: ['$placedAt', from] },
                    { $lte: ['$placedAt', to] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                ordersCount: { $sum: 1 },
                totalSpend: { $sum: '$total' },
                lastOrderAt: { $max: '$placedAt' },
              },
            },
          ],
          as: 'orderStats',
        },
      },
      { $unwind: { path: '$orderStats', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          customerId: { $toString: '$_id' },
          displayName: { $concat: ['$firstName', ' ', '$lastName'] },
          email: 1,
          joinedAt: { $dateToString: { date: '$createdAt' } },
          ordersCount: { $ifNull: ['$orderStats.ordersCount', 0] },
          totalSpend: { $ifNull: ['$orderStats.totalSpend', 0] },
          averageOrderValue: {
            $cond: [
              { $gt: ['$orderStats.ordersCount', 0] },
              { $round: [{ $divide: ['$orderStats.totalSpend', '$orderStats.ordersCount'] }, 0] },
              0,
            ],
          },
          lastOrderAt: {
            $cond: [
              { $gt: ['$orderStats.lastOrderAt', null] },
              { $dateToString: { date: '$orderStats.lastOrderAt' } },
              null,
            ],
          },
          refundAmount: { $literal: 0 },
          returnCount: { $literal: 0 },
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

    const result = await User.aggregate(pipeline);
    const totalItems = result[0]?.metadata[0]?.total || 0;
    const rawData = result[0]?.data || [];

    const items: CustomerTableRow[] = rawData.map((d: any) => ({
      customerId: d.customerId,
      displayName: d.displayName.trim() || 'Customer',
      email: d.email,
      joinedAt: d.joinedAt,
      ordersCount: d.ordersCount,
      totalSpend: d.totalSpend,
      averageOrderValue: d.averageOrderValue,
      lastOrderAt: d.lastOrderAt,
      refundAmount: d.refundAmount,
      returnCount: d.returnCount,
    }));

    return { items, totalItems };
  }

  async getAllCustomersForExport(query: CustomersQuery): Promise<CustomerTableRow[]> {
    const { fromDate, toDate } = analyticsDateService.resolveDateRange(query);
    const sortBy = query.sortBy || 'totalSpend';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const data = await this.calculateCustomersTable(
      fromDate,
      toDate,
      query.search,
      1,
      ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS,
      sortBy,
      sortOrder
    );
    return data.items;
  }
}

export const customersReportService = new CustomersReportService();
