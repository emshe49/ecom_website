import { DashboardInterval } from './dashboard.constants.js';

export interface DashboardQueryParams {
  from?: string;
  to?: string;
  interval?: DashboardInterval;
}

export interface MetricComparison {
  current: number;
  previous: number;
  changePercentage: number;
}

export interface DashboardKpis {
  revenue: MetricComparison; // In minor units (cents)
  orders: MetricComparison;
  averageOrderValue: MetricComparison; // In minor units (cents)
  newCustomers: MetricComparison;
  pendingFulfillment: { current: number };
  lowStockCount: { current: number };
  outOfStockCount: { current: number };
}

export interface StatusBreakdown {
  status: string;
  count: number;
  totalAmount?: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  totalAmount: number;
}

export interface DashboardBreakdowns {
  ordersByStatus: StatusBreakdown[];
  ordersByPaymentStatus: StatusBreakdown[];
  ordersByFulfillmentStatus: StatusBreakdown[];
  paymentsByMethod: PaymentMethodBreakdown[];
}

export interface TimeseriesPoint {
  date: string;
  revenue: number; // in minor units
  ordersCount: number;
  averageOrderValue: number; // in minor units
}

export interface ActionItem {
  type: 'PENDING_ORDER' | 'LOW_STOCK' | 'FAILED_PAYMENT' | 'UNFULFILLED_SHIPMENT';
  message: string;
  count: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  actionUrl: string;
}

export interface LowStockAlert {
  variantId: string;
  sku: string;
  productName: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
}

export interface RecentOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  itemCount: number;
  placedAt: string;
}

export interface CatalogSummary {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  totalReviews: number;
  averageReviewRating: number;
  activePromotionsCount: number;
  activeCouponsCount: number;
  totalCouponRedemptionsInPeriod: number;
}

export interface DashboardResponse {
  meta: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    interval: DashboardInterval;
    currency: string;
    generatedAt: string;
  };
  kpis: DashboardKpis;
  breakdowns: DashboardBreakdowns;
  trends: {
    timeseries: TimeseriesPoint[];
  };
  operations: {
    actionItems: ActionItem[];
    lowStockAlerts: LowStockAlert[];
    recentOrders: RecentOrderSummary[];
  };
  catalogSummary: CatalogSummary;
}
