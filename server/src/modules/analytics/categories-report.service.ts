import { Order } from '../orders/order.model.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../orders/order.constants.js';
import { Product } from '../catalog/products/product.model.js';
import { Category } from '../catalog/categories/category.model.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  AnalyticsBaseQuery,
  CategoriesReportResponse,
  CategoryTableRow,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class CategoriesReportService {
  async getCategoriesReport(query: AnalyticsBaseQuery): Promise<CategoriesReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'grossRevenue';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const { items, totalItems, summaryStats } = await this.aggregateCategories(
      fromDate,
      toDate,
      page,
      limit,
      sortBy,
      sortOrder
    );

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
      attributionNote:
        'Historical category report is based on current Product category assignment.',
      summary: summaryStats,
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
        hasNextPage: page * limit < totalItems,
        hasPrevPage: page > 1,
      },
    };
  }

  private async aggregateCategories(
    from: Date,
    to: Date,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 1 | -1
  ): Promise<{ items: CategoryTableRow[]; totalItems: number; summaryStats: any }> {
    const pipeline: any[] = [
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          status: { $ne: ORDER_STATUS.CANCELLED },
          paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: Product.collection.name,
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: Category.collection.name,
          localField: 'product.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            categoryId: { $ifNull: ['$category._id', null] },
            categoryName: { $ifNull: ['$category.name', 'Uncategorized'] },
            slug: { $ifNull: ['$category.slug', 'uncategorized'] },
          },
          unitsSold: { $sum: '$items.quantity' },
          grossRevenue: {
            $sum: {
              $ifNull: ['$items.finalLineTotal', { $subtract: ['$items.lineTotal', { $ifNull: ['$items.discountAmount', 0] }] }],
            },
          },
          discountAmount: { $sum: { $ifNull: ['$items.discountAmount', 0] } },
          ordersCount: { $sum: 1 },
        },
      },
      {
        $project: {
          categoryId: { $ifNull: [{ $toString: '$_id.categoryId' }, 'uncategorized'] },
          categoryName: '$_id.categoryName',
          slug: '$_id.slug',
          unitsSold: 1,
          ordersCount: 1,
          grossRevenue: 1,
          discountAmount: 1,
          refundAmount: { $literal: 0 },
          netRevenue: '$grossRevenue',
          averageOrderValueContribution: {
            $cond: [
              { $gt: ['$ordersCount', 0] },
              { $round: [{ $divide: ['$grossRevenue', '$ordersCount'] }, 0] },
              0,
            ],
          },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalCategoriesWithSales: { $sum: 1 },
                grossRevenue: { $sum: '$grossRevenue' },
                netRevenue: { $sum: '$netRevenue' },
              },
            },
          ],
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
    const sumRow = result[0]?.summary[0] || {
      totalCategoriesWithSales: 0,
      grossRevenue: 0,
      netRevenue: 0,
    };
    const totalItems = result[0]?.metadata[0]?.total || 0;
    const rawData = result[0]?.data || [];

    const summaryStats = {
      totalCategoriesWithSales: sumRow.totalCategoriesWithSales,
      grossRevenue: sumRow.grossRevenue,
      netRevenue: sumRow.netRevenue,
    };

    const items: CategoryTableRow[] = rawData.map((d: any) => ({
      categoryId: d.categoryId,
      categoryName: d.categoryName,
      slug: d.slug,
      unitsSold: d.unitsSold || 0,
      ordersCount: d.ordersCount || 0,
      grossRevenue: d.grossRevenue || 0,
      discountAmount: d.discountAmount || 0,
      refundAmount: d.refundAmount || 0,
      netRevenue: d.netRevenue || 0,
      averageOrderValueContribution: d.averageOrderValueContribution || 0,
    }));

    return { items, totalItems, summaryStats };
  }

  async getAllCategoriesForExport(query: AnalyticsBaseQuery): Promise<CategoryTableRow[]> {
    const { fromDate, toDate } = analyticsDateService.resolveDateRange(query);
    const sortBy = query.sortBy || 'grossRevenue';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const data = await this.aggregateCategories(fromDate, toDate, 1, ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS, sortBy, sortOrder);
    return data.items;
  }
}

export const categoriesReportService = new CategoriesReportService();
