import { Order } from '../orders/order.model.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../orders/order.constants.js';
import { Product } from '../catalog/products/product.model.js';
import { Brand } from '../catalog/brands/brand.model.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  AnalyticsBaseQuery,
  BrandsReportResponse,
  BrandTableRow,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class BrandsReportService {
  async getBrandsReport(query: AnalyticsBaseQuery): Promise<BrandsReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'grossRevenue';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const { items, totalItems, summaryStats } = await this.aggregateBrands(
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
        'Historical brand report is based on current Product brand assignment.',
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

  private async aggregateBrands(
    from: Date,
    to: Date,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 1 | -1
  ): Promise<{ items: BrandTableRow[]; totalItems: number; summaryStats: any }> {
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
          from: Brand.collection.name,
          localField: 'product.brandId',
          foreignField: '_id',
          as: 'brand',
        },
      },
      { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            brandId: { $ifNull: ['$brand._id', null] },
            brandName: { $ifNull: ['$brand.name', 'No Brand'] },
            slug: { $ifNull: ['$brand.slug', 'no-brand'] },
          },
          productsSet: { $addToSet: '$items.productId' },
          unitsSold: { $sum: '$items.quantity' },
          grossRevenue: {
            $sum: {
              $ifNull: ['$items.finalLineTotal', { $subtract: ['$items.lineTotal', { $ifNull: ['$items.discountAmount', 0] }] }],
            },
          },
        },
      },
      {
        $project: {
          brandId: { $ifNull: [{ $toString: '$_id.brandId' }, 'no-brand'] },
          brandName: '$_id.brandName',
          slug: '$_id.slug',
          productsSold: { $size: '$productsSet' },
          unitsSold: 1,
          grossRevenue: 1,
          refundAmount: { $literal: 0 },
          netRevenue: '$grossRevenue',
          averageRating: { $literal: 0 },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalBrandsWithSales: { $sum: 1 },
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
      totalBrandsWithSales: 0,
      grossRevenue: 0,
      netRevenue: 0,
    };
    const totalItems = result[0]?.metadata[0]?.total || 0;
    const rawData = result[0]?.data || [];

    const summaryStats = {
      totalBrandsWithSales: sumRow.totalBrandsWithSales,
      grossRevenue: sumRow.grossRevenue,
      netRevenue: sumRow.netRevenue,
    };

    const items: BrandTableRow[] = rawData.map((d: any) => ({
      brandId: d.brandId,
      brandName: d.brandName,
      slug: d.slug,
      productsSold: d.productsSold || 0,
      unitsSold: d.unitsSold || 0,
      grossRevenue: d.grossRevenue || 0,
      refundAmount: d.refundAmount || 0,
      netRevenue: d.netRevenue || 0,
      averageRating: d.averageRating || 0,
    }));

    return { items, totalItems, summaryStats };
  }

  async getAllBrandsForExport(query: AnalyticsBaseQuery): Promise<BrandTableRow[]> {
    const { fromDate, toDate } = analyticsDateService.resolveDateRange(query);
    const sortBy = query.sortBy || 'grossRevenue';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const data = await this.aggregateBrands(fromDate, toDate, 1, ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS, sortBy, sortOrder);
    return data.items;
  }
}

export const brandsReportService = new BrandsReportService();
