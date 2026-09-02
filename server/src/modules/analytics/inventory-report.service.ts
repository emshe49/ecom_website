import { InventoryTransaction } from '../inventory/inventory-transaction.model.js';
import { Inventory } from '../inventory/inventory.model.js';
import { ProductVariant } from '../catalog/products/product-variant.model.js';
import { Product } from '../catalog/products/product.model.js';
import { TRANSACTION_TYPE } from '../inventory/inventory.constants.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  InventoryQuery,
  InventoryReportResponse,
  InventoryTableRow,
  InventoryMovementSummary,
  InventoryStockHealthSummary,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class InventoryReportService {
  async getInventoryReport(query: InventoryQuery): Promise<InventoryReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'available';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [movementSummary, stockHealth, tableData] = await Promise.all([
      this.calculateMovementSummary(fromDate, toDate),
      this.calculateStockHealth(),
      this.calculateInventoryTable(fromDate, toDate, query, page, limit, sortBy, sortOrder),
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
      movementSummary,
      stockHealth,
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

  private async calculateMovementSummary(from: Date, to: Date): Promise<InventoryMovementSummary> {
    const raw = await InventoryTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: '$type',
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    const typeMap = new Map<string, number>();
    raw.forEach((r) => typeMap.set(r._id, r.totalQuantity));

    return {
      stockInUnits: typeMap.get(TRANSACTION_TYPE.STOCK_IN) || 0,
      stockOutUnits: typeMap.get(TRANSACTION_TYPE.STOCK_OUT) || 0,
      saleUnits: typeMap.get(TRANSACTION_TYPE.SALE) || 0,
      returnedUnits: (typeMap.get('RETURN_RESTOCK') || 0) + (typeMap.get(TRANSACTION_TYPE.ORDER_CANCELLATION) || 0),
      adjustmentUnits: typeMap.get(TRANSACTION_TYPE.ADJUSTMENT) || 0,
      reservationUnits: typeMap.get(TRANSACTION_TYPE.RESERVATION) || 0,
      releaseUnits: typeMap.get(TRANSACTION_TYPE.RELEASE) || 0,
    };
  }

  private async calculateStockHealth(): Promise<InventoryStockHealthSummary> {
    const raw = await Inventory.aggregate([
      {
        $project: {
          onHand: 1,
          reserved: 1,
          lowStockThreshold: 1,
          available: { $subtract: ['$onHand', '$reserved'] },
        },
      },
      {
        $group: {
          _id: null,
          totalVariants: { $sum: 1 },
          lowStockVariants: {
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
          outOfStockVariants: {
            $sum: { $cond: [{ $lte: ['$available', 0] }, 1, 0] },
          },
          avgAvailableStock: { $avg: '$available' },
        },
      },
    ]);

    const row = raw[0] || {
      totalVariants: 0,
      lowStockVariants: 0,
      outOfStockVariants: 0,
      avgAvailableStock: 0,
    };

    return {
      totalVariants: row.totalVariants,
      lowStockVariants: row.lowStockVariants,
      outOfStockVariants: row.outOfStockVariants,
      averageAvailableStock: Number(Number(row.avgAvailableStock || 0).toFixed(2)),
    };
  }

  private async calculateInventoryTable(
    from: Date,
    to: Date,
    query: InventoryQuery,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 1 | -1
  ): Promise<{ items: InventoryTableRow[]; totalItems: number }> {
    const pipeline: any[] = [
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
    ];

    if (query.lowStockOnly) {
      pipeline.push({
        $match: {
          $expr: { $lte: ['$available', '$lowStockThreshold'] },
        },
      });
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pipeline.push({
        $match: {
          $or: [
            { 'product.name': { $regex: escaped, $options: 'i' } },
            { 'variant.sku': { $regex: escaped, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: InventoryTransaction.collection.name,
          let: { varId: '$variantId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$variantId', '$$varId'] },
                    { $gte: ['$createdAt', from] },
                    { $lte: ['$createdAt', to] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$type',
                qty: { $sum: '$quantity' },
              },
            },
          ],
          as: 'transactions',
        },
      },
      {
        $project: {
          variantId: { $toString: '$variantId' },
          productId: { $ifNull: [{ $toString: '$product._id' }, ''] },
          productName: { $ifNull: ['$product.name', 'Unknown Product'] },
          sku: { $ifNull: ['$variant.sku', 'UNKNOWN'] },
          currentOnHand: '$onHand',
          reserved: '$reserved',
          available: '$available',
          lowStockThreshold: '$lowStockThreshold',
          stockIn: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this._id', TRANSACTION_TYPE.STOCK_IN] },
                  { $add: ['$$value', '$$this.qty'] },
                  '$$value',
                ],
              },
            },
          },
          stockOut: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this._id', TRANSACTION_TYPE.STOCK_OUT] },
                  { $add: ['$$value', '$$this.qty'] },
                  '$$value',
                ],
              },
            },
          },
          sold: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this._id', TRANSACTION_TYPE.SALE] },
                  { $add: ['$$value', '$$this.qty'] },
                  '$$value',
                ],
              },
            },
          },
          returned: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $cond: [
                  {
                    $in: [
                      '$$this._id',
                      ['RETURN_RESTOCK', TRANSACTION_TYPE.ORDER_CANCELLATION],
                    ],
                  },
                  { $add: ['$$value', '$$this.qty'] },
                  '$$value',
                ],
              },
            },
          },
          adjustments: {
            $reduce: {
              input: '$transactions',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this._id', TRANSACTION_TYPE.ADJUSTMENT] },
                  { $add: ['$$value', '$$this.qty'] },
                  '$$value',
                ],
              },
            },
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
      }
    );

    const result = await Inventory.aggregate(pipeline);
    const totalItems = result[0]?.metadata[0]?.total || 0;
    const rawData = result[0]?.data || [];

    const items: InventoryTableRow[] = rawData.map((d: any) => ({
      variantId: d.variantId,
      productId: d.productId,
      productName: d.productName,
      sku: d.sku,
      stockIn: d.stockIn || 0,
      stockOut: d.stockOut || 0,
      sold: d.sold || 0,
      returned: d.returned || 0,
      adjustments: d.adjustments || 0,
      currentOnHand: d.currentOnHand || 0,
      reserved: d.reserved || 0,
      available: d.available || 0,
      lowStockThreshold: d.lowStockThreshold || 5,
    }));

    return { items, totalItems };
  }

  async getAllInventoryForExport(query: InventoryQuery): Promise<InventoryTableRow[]> {
    const { fromDate, toDate } = analyticsDateService.resolveDateRange(query);
    const sortBy = query.sortBy || 'available';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const data = await this.calculateInventoryTable(
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

export const inventoryReportService = new InventoryReportService();
