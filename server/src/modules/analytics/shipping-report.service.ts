import { Shipment } from '../shipping/shipment.model.js';
import { SHIPMENT_STATUS } from '../shipping/shipping.constants.js';
import { Order } from '../orders/order.model.js';
import { ORDER_STATUS } from '../orders/order.constants.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  AnalyticsBaseQuery,
  ShippingReportResponse,
  ShippingCarrierBreakdownPoint,
} from './analytics.types.js';

export class ShippingReportService {
  async getShippingReport(query: AnalyticsBaseQuery): Promise<ShippingReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const [currentStats, prevStats, carrierBreakdown, methodBreakdown, recentShipments] =
      await Promise.all([
        this.calculateShippingStats(fromDate, toDate),
        this.calculateShippingStats(prevFromDate, prevToDate),
        this.calculateCarrierBreakdown(fromDate, toDate),
        this.calculateMethodBreakdown(fromDate, toDate),
        this.getRecentShipments(fromDate, toDate),
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
        totalShipments: analyticsDateService.buildMetricComparison(
          currentStats.total,
          prevStats.total
        ),
        deliveredShipments: analyticsDateService.buildMetricComparison(
          currentStats.delivered,
          prevStats.delivered
        ),
        failedShipments: analyticsDateService.buildMetricComparison(
          currentStats.failed,
          prevStats.failed
        ),
        averageDeliveryHours: currentStats.averageDeliveryHours,
        shippingRevenue: analyticsDateService.buildMetricComparison(
          currentStats.shippingRevenue,
          prevStats.shippingRevenue
        ),
      },
      carrierBreakdown,
      methodBreakdown,
      items: recentShipments,
      pagination: {
        page: 1,
        limit: Math.max(recentShipments.length, 1),
        totalItems: recentShipments.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  private async calculateShippingStats(from: Date, to: Date) {
    const [shipmentAgg, orderAgg] = await Promise.all([
      Shipment.aggregate([
        {
          $match: {
            createdAt: { $gte: from, $lte: to },
          },
        },
        {
          $project: {
            status: 1,
            shippedAt: 1,
            deliveredAt: 1,
            deliveryDurationMs: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', SHIPMENT_STATUS.DELIVERED] },
                    { $ne: ['$shippedAt', null] },
                    { $ne: ['$deliveredAt', null] },
                  ],
                },
                { $subtract: ['$deliveredAt', '$shippedAt'] },
                null,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', SHIPMENT_STATUS.DELIVERED] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', SHIPMENT_STATUS.FAILED] }, 1, 0] },
            },
            avgDurationMs: { $avg: '$deliveryDurationMs' },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            placedAt: { $gte: from, $lte: to },
            status: { $ne: ORDER_STATUS.CANCELLED },
          },
        },
        {
          $group: {
            _id: null,
            shippingRevenue: { $sum: '$shippingFee' },
          },
        },
      ]),
    ]);

    const sRow = shipmentAgg[0] || { total: 0, delivered: 0, failed: 0, avgDurationMs: null };
    const oRow = orderAgg[0] || { shippingRevenue: 0 };

    const averageDeliveryHours = sRow.avgDurationMs
      ? Number((sRow.avgDurationMs / (1000 * 60 * 60)).toFixed(1))
      : 0;

    return {
      total: sRow.total,
      delivered: sRow.delivered,
      failed: sRow.failed,
      averageDeliveryHours,
      shippingRevenue: oRow.shippingRevenue,
    };
  }

  private async calculateCarrierBreakdown(from: Date, to: Date): Promise<ShippingCarrierBreakdownPoint[]> {
    const raw = await Shipment.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $project: {
          carrier: { $ifNull: ['$carrierName', '$carrier'] },
          status: 1,
          durationMs: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', SHIPMENT_STATUS.DELIVERED] },
                  { $ne: ['$shippedAt', null] },
                  { $ne: ['$deliveredAt', null] },
                ],
              },
              { $subtract: ['$deliveredAt', '$shippedAt'] },
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$carrier',
          shipments: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ['$status', SHIPMENT_STATUS.DELIVERED] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', SHIPMENT_STATUS.FAILED] }, 1, 0] },
          },
          avgDurationMs: { $avg: '$durationMs' },
        },
      },
      { $sort: { shipments: -1 } },
    ]);

    return raw.map((r) => ({
      carrier: r._id || 'Standard Delivery',
      shipments: r.shipments,
      delivered: r.delivered,
      failed: r.failed,
      averageDeliveryHours: r.avgDurationMs
        ? Number((r.avgDurationMs / (1000 * 60 * 60)).toFixed(1))
        : 0,
    }));
  }

  private async calculateMethodBreakdown(from: Date, to: Date) {
    const raw = await Order.aggregate([
      {
        $match: {
          placedAt: { $gte: from, $lte: to },
          status: { $ne: ORDER_STATUS.CANCELLED },
          'shippingMethod.code': { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            code: '$shippingMethod.code',
            name: '$shippingMethod.name',
          },
          ordersCount: { $sum: 1 },
          shippingRevenue: { $sum: '$shippingFee' },
        },
      },
      { $sort: { ordersCount: -1 } },
    ]);

    return raw.map((r) => {
      const ordersCount = r.ordersCount || 0;
      const shippingRevenue = r.shippingRevenue || 0;
      return {
        code: r._id.code,
        name: r._id.name || r._id.code,
        ordersCount,
        shippingRevenue,
        averageFee: ordersCount > 0 ? Math.round(shippingRevenue / ordersCount) : 0,
      };
    });
  }

  private async getRecentShipments(from: Date, to: Date) {
    const shipments = await Shipment.find({
      createdAt: { $gte: from, $lte: to },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return shipments.map((s: any) => {
      let deliveryDurationHours: number | null = null;
      if (s.shippedAt && s.deliveredAt) {
        deliveryDurationHours = Number(
          ((new Date(s.deliveredAt).getTime() - new Date(s.shippedAt).getTime()) / (1000 * 60 * 60)).toFixed(1)
        );
      }

      return {
        id: s._id.toString(),
        shipmentNumber: s.shipmentNumber,
        orderNumber: s.orderNumber,
        carrier: s.carrierName || s.carrier || 'Manual',
        status: s.status,
        shippedAt: s.shippedAt ? new Date(s.shippedAt).toISOString() : null,
        deliveredAt: s.deliveredAt ? new Date(s.deliveredAt).toISOString() : null,
        deliveryDurationHours,
        fee: s.shippingMethod?.fee || 0,
      };
    });
  }
}

export const shippingReportService = new ShippingReportService();
