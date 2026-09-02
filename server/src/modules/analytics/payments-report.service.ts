import { Payment } from '../payments/payment.model.js';
import { PAYMENT_STATUS } from '../payments/payment.constants.js';
import { analyticsDateService } from './analytics-date.service.js';
import {
  PaymentsQuery,
  PaymentsReportResponse,
  PaymentsSummary,
  PaymentTableRow,
  PaymentMethodBreakdownPoint,
  PaymentProviderBreakdownPoint,
} from './analytics.types.js';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';

export class PaymentsReportService {
  async getPaymentsReport(query: PaymentsQuery): Promise<PaymentsReportResponse> {
    const { fromDate, toDate, prevFromDate, prevToDate, groupBy } =
      analyticsDateService.resolveDateRange(query);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const baseFilter = this.buildBaseFilter(query, fromDate, toDate);
    const prevFilter = this.buildBaseFilter(query, prevFromDate, prevToDate);

    const [currentSummaryRaw, prevSummaryRaw, breakdownsRaw, tableData] = await Promise.all([
      this.calculatePaymentsSummary(baseFilter),
      this.calculatePaymentsSummary(prevFilter),
      this.calculateBreakdowns(baseFilter),
      this.calculatePaymentsTable(baseFilter, page, limit, sortBy, sortOrder),
    ]);

    const summary: PaymentsSummary = {
      successfulPayments: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.successfulPayments,
        prevSummaryRaw.successfulPayments
      ),
      failedPayments: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.failedPayments,
        prevSummaryRaw.failedPayments
      ),
      pendingPayments: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.pendingPayments,
        prevSummaryRaw.pendingPayments
      ),
      paidAmount: analyticsDateService.buildMetricComparison(
        currentSummaryRaw.paidAmount,
        prevSummaryRaw.paidAmount
      ),
      failureRate: currentSummaryRaw.failureRate,
      successRate: currentSummaryRaw.successRate,
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

  private buildBaseFilter(query: PaymentsQuery, from: Date, to: Date): Record<string, any> {
    const filter: Record<string, any> = {
      createdAt: { $gte: from, $lte: to },
    };

    if (query.method) {
      filter.method = query.method;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.provider) {
      filter.provider = query.provider;
    }

    return filter;
  }

  private async calculatePaymentsSummary(filter: Record<string, any>) {
    const result = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.SUCCEEDED] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.FAILED] }, 1, 0] },
          },
          pending: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING],
                  ],
                },
                1,
                0,
              ],
            },
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.SUCCEEDED] }, '$amount', 0] },
          },
        },
      },
    ]);

    const row = result[0] || {
      total: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      paidAmount: 0,
    };

    const finalizedAttempts = row.successful + row.failed;
    const failureRate =
      finalizedAttempts > 0
        ? Number(((row.failed / finalizedAttempts) * 100).toFixed(2))
        : 0;
    const successRate =
      finalizedAttempts > 0
        ? Number(((row.successful / finalizedAttempts) * 100).toFixed(2))
        : (row.total > 0 && row.successful > 0 ? 100 : 0);

    return {
      successfulPayments: row.successful,
      failedPayments: row.failed,
      pendingPayments: row.pending,
      paidAmount: row.paidAmount,
      failureRate,
      successRate,
    };
  }

  private async calculateBreakdowns(filter: Record<string, any>) {
    const [byMethodRaw, byProviderRaw, totalPaidResult] = await Promise.all([
      Payment.aggregate([
        { $match: { ...filter, status: PAYMENT_STATUS.SUCCEEDED } },
        {
          $group: {
            _id: '$method',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$provider',
            successfulCount: {
              $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.SUCCEEDED] }, 1, 0] },
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.FAILED] }, 1, 0] },
            },
            totalAmount: {
              $sum: { $cond: [{ $eq: ['$status', PAYMENT_STATUS.SUCCEEDED] }, '$amount', 0] },
            },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { ...filter, status: PAYMENT_STATUS.SUCCEEDED } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
      ]),
    ]);

    const totalPaidAmount = totalPaidResult[0]?.totalAmount || 0;

    const byMethod: PaymentMethodBreakdownPoint[] = byMethodRaw.map((b) => ({
      method: b._id,
      count: b.count,
      amount: b.amount,
      percentage:
        totalPaidAmount > 0 ? Number(((b.amount / totalPaidAmount) * 100).toFixed(2)) : 0,
    }));

    const byProvider: PaymentProviderBreakdownPoint[] = byProviderRaw.map((p) => ({
      provider: p._id,
      successfulCount: p.successfulCount,
      failedCount: p.failedCount,
      totalAmount: p.totalAmount,
    }));

    return { byMethod, byProvider };
  }

  private async calculatePaymentsTable(
    filter: Record<string, any>,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 1 | -1
  ): Promise<{ items: PaymentTableRow[]; totalItems: number }> {
    const totalItems = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('orderId', 'orderNumber')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items: PaymentTableRow[] = payments.map((pay: any) => ({
      id: pay._id.toString(),
      paymentNumber: pay.paymentNumber,
      orderNumber: (pay.orderId as any)?.orderNumber || 'N/A',
      amount: pay.amount,
      currency: pay.currency || 'USD',
      method: pay.method,
      status: pay.status,
      provider: pay.provider,
      createdAt: (pay.createdAt || new Date()).toISOString(),
      paidAt: pay.paidAt ? pay.paidAt.toISOString() : null,
    }));

    return { items, totalItems };
  }

  async getAllPaymentsForExport(query: PaymentsQuery): Promise<PaymentTableRow[]> {
    const { fromDate, toDate } = analyticsDateService.resolveDateRange(query);
    const filter = this.buildBaseFilter(query, fromDate, toDate);
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const data = await this.calculatePaymentsTable(filter, 1, ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS, sortBy, sortOrder);
    return data.items;
  }
}

export const paymentsReportService = new PaymentsReportService();
