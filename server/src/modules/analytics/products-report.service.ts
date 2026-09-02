import mongoose from 'mongoose';
import { Order } from '../orders/order.model.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../orders/order.constants.js';
import { Product } from '../catalog/products/product.model.js';
import { Review } from '../reviews/review.model.js';
import { REVIEW_STATUS } from '../reviews/review.constants.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  ProductsQuery,
  ProductsReportResponse,
  ProductTableRow,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class ProductsReportService {
  async getProductsReport(query: ProductsQuery): Promise<ProductsReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'unitsSold';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const { items, totalItems, summaryStats } = await this.aggregateProductPerformance(
      fromDate,
      toDate,
      query,
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

  private async aggregateProductPerformance(
    from: Date,
    to: Date,
    query: ProductsQuery,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 1 | -1
  ): Promise<{ items: ProductTableRow[]; totalItems: number; summaryStats: any }> {
    const matchOrder: Record<string, any> = {
      placedAt: { $gte: from, $lte: to },
      status: { $ne: ORDER_STATUS.CANCELLED },
      paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
    };

    const productMatch: Record<string, any> = {};
    if (query.categoryId) {
      productMatch['productDetails.categoryId'] = new mongoose.Types.ObjectId(query.categoryId);
    }
    if (query.brandId) {
      productMatch['productDetails.brandId'] = new mongoose.Types.ObjectId(query.brandId);
    }
    if (query.status) {
      productMatch['productDetails.status'] = query.status;
    }
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      productMatch['$or'] = [
        { '_id.productName': { $regex: escaped, $options: 'i' } },
        { 'productDetails.name': { $regex: escaped, $options: 'i' } },
      ];
    }

    const pipeline: any[] = [
      { $match: matchOrder },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            productId: '$items.productId',
            productName: '$items.productName',
            productSlug: '$items.productSlug',
          },
          unitsSold: { $sum: '$items.quantity' },
          grossRevenue: {
            $sum: {
              $ifNull: ['$items.finalLineTotal', { $subtract: ['$items.lineTotal', { $ifNull: ['$items.discountAmount', 0] }] }],
            },
          },
          discountAllocated: { $sum: { $ifNull: ['$items.discountAmount', 0] } },
          ordersCount: { $sum: 1 },
          skus: { $addToSet: '$items.sku' },
        },
      },
      {
        $lookup: {
          from: Product.collection.name,
          localField: '_id.productId',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
    ];

    if (Object.keys(productMatch).length > 0) {
      pipeline.push({ $match: productMatch });
    }

    pipeline.push(
      {
        $lookup: {
          from: Review.collection.name,
          let: { prodId: '$_id.productId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$productId', '$$prodId'] },
                    { $eq: ['$status', REVIEW_STATUS.PUBLISHED] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 },
              },
            },
          ],
          as: 'reviewsData',
        },
      },
      { $unwind: { path: '$reviewsData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id.productId',
          productName: { $ifNull: ['$productDetails.name', '$_id.productName'] },
          slug: { $ifNull: ['$productDetails.slug', '$_id.productSlug'] },
          skuCount: { $size: '$skus' },
          unitsSold: 1,
          grossRevenue: 1,
          discountAllocated: 1,
          refundAmount: { $literal: 0 },
          netRevenue: '$grossRevenue',
          ordersCount: 1,
          averageRating: {
            $cond: [
              { $gt: ['$reviewsData.avgRating', null] },
              { $round: ['$reviewsData.avgRating', 2] },
              0,
            ],
          },
          reviewCount: { $ifNull: ['$reviewsData.reviewCount', 0] },
          returnQuantity: { $literal: 0 },
          returnRate: { $literal: 0 },
        },
      },
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalProductsSold: { $sum: 1 },
                totalUnitsSold: { $sum: '$unitsSold' },
                grossProductRevenue: { $sum: '$grossRevenue' },
                netProductRevenue: { $sum: '$netRevenue' },
                totalOrdersSum: { $sum: '$ordersCount' },
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
      }
    );

    const aggResult = await Order.aggregate(pipeline);
    const summaryRow = aggResult[0]?.totalStats[0] || {
      totalProductsSold: 0,
      totalUnitsSold: 0,
      grossProductRevenue: 0,
      netProductRevenue: 0,
      totalOrdersSum: 0,
    };
    const totalItems = aggResult[0]?.metadata[0]?.total || 0;
    const rawData = aggResult[0]?.data || [];

    const summaryStats = {
      totalProductsSold: summaryRow.totalProductsSold,
      totalUnitsSold: summaryRow.totalUnitsSold,
      grossProductRevenue: summaryRow.grossProductRevenue,
      netProductRevenue: summaryRow.netProductRevenue,
      averageUnitsPerOrder:
        summaryRow.totalOrdersSum > 0
          ? Number((summaryRow.totalUnitsSold / summaryRow.totalOrdersSum).toFixed(2))
          : 0,
    };

    const items: ProductTableRow[] = rawData.map((d: any) => ({
      productId: d.productId ? d.productId.toString() : '',
      productName: d.productName,
      slug: d.slug,
      skuCount: d.skuCount || 1,
      unitsSold: d.unitsSold || 0,
      grossRevenue: d.grossRevenue || 0,
      discountAllocated: d.discountAllocated || 0,
      refundAmount: d.refundAmount || 0,
      netRevenue: d.netRevenue || 0,
      ordersCount: d.ordersCount || 0,
      averageRating: d.averageRating || 0,
      reviewCount: d.reviewCount || 0,
      returnQuantity: d.returnQuantity || 0,
      returnRate: d.returnRate || 0,
    }));

    return { items, totalItems, summaryStats };
  }

  async getAllProductsForExport(query: ProductsQuery): Promise<ProductTableRow[]> {
    const { fromDate, toDate } = analyticsDateService.resolveDateRange(query);
    const sortBy = query.sortBy || 'unitsSold';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const data = await this.aggregateProductPerformance(
      fromDate,
      toDate,
      query,
      1,
      ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS,
      sortBy,
      sortOrder
    );
    return data.items;
  }
}

export const productsReportService = new ProductsReportService();
