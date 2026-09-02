import { AnalyticsGroupBy, SortOrder } from './analytics.constants.js';

export interface AnalyticsBaseQuery {
  from?: string;
  to?: string;
  groupBy?: AnalyticsGroupBy;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface ReportRangeMeta {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  groupBy: AnalyticsGroupBy;
  currency: string;
  generatedAt: string;
}

export interface MetricComparison {
  current: number;
  previous: number;
  changePercentage: number;
}

export interface ReportPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// 1. Sales Report
export interface SalesSummary {
  grossRevenue: MetricComparison;
  refundAmount: MetricComparison;
  netRevenue: MetricComparison;
  discountAmount: MetricComparison;
  shippingRevenue: MetricComparison;
  orders: MetricComparison;
  itemsSold: MetricComparison;
  averageOrderValue: MetricComparison;
  averageItemsPerOrder: MetricComparison;
}

export interface SalesTrendPoint {
  period: string;
  grossRevenue: number;
  refundAmount: number;
  netRevenue: number;
  discountAmount: number;
  shippingRevenue: number;
  orderCount: number;
  itemsSold: number;
  averageOrderValue: number;
}

export interface SalesTableRow {
  period: string;
  ordersCount: number;
  itemsSold: number;
  grossRevenue: number;
  discountAmount: number;
  refundAmount: number;
  netRevenue: number;
  averageOrderValue: number;
}

export interface SalesReportResponse {
  range: ReportRangeMeta;
  summary: SalesSummary;
  trend: SalesTrendPoint[];
  items: SalesTableRow[];
  pagination: ReportPagination;
}

// 2. Orders Report
export interface OrdersQuery extends AnalyticsBaseQuery {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  customerId?: string;
}

export interface OrdersSummary {
  totalOrders: MetricComparison;
  paidOrders: MetricComparison;
  cancelledOrders: MetricComparison;
  deliveredOrders: MetricComparison;
  averageOrderValue: MetricComparison;
  averageItemsPerOrder: MetricComparison;
}

export interface StatusBreakdownPoint {
  status: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface OrderTableRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
}

export interface OrdersReportResponse {
  range: ReportRangeMeta;
  summary: OrdersSummary;
  breakdown: {
    byStatus: StatusBreakdownPoint[];
    byPaymentStatus: StatusBreakdownPoint[];
  };
  items: OrderTableRow[];
  pagination: ReportPagination;
}

// 3. Payment Report
export interface PaymentsQuery extends AnalyticsBaseQuery {
  method?: string;
  status?: string;
  provider?: string;
}

export interface PaymentsSummary {
  successfulPayments: MetricComparison;
  failedPayments: MetricComparison;
  pendingPayments: MetricComparison;
  paidAmount: MetricComparison;
  failureRate: number;
  successRate: number;
}

export interface PaymentMethodBreakdownPoint {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentProviderBreakdownPoint {
  provider: string;
  successfulCount: number;
  failedCount: number;
  totalAmount: number;
}

export interface PaymentTableRow {
  id: string;
  paymentNumber: string;
  orderNumber: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  provider: string;
  createdAt: string;
  paidAt?: string | null;
}

export interface PaymentsReportResponse {
  range: ReportRangeMeta;
  summary: PaymentsSummary;
  breakdown: {
    byMethod: PaymentMethodBreakdownPoint[];
    byProvider: PaymentProviderBreakdownPoint[];
  };
  items: PaymentTableRow[];
  pagination: ReportPagination;
}

// 4. Products Report
export interface ProductsQuery extends AnalyticsBaseQuery {
  categoryId?: string;
  brandId?: string;
  status?: string;
  search?: string;
}

export interface ProductTableRow {
  productId: string;
  productName: string;
  slug: string;
  skuCount: number;
  unitsSold: number;
  grossRevenue: number;
  discountAllocated: number;
  refundAmount: number;
  netRevenue: number;
  ordersCount: number;
  averageRating: number;
  reviewCount: number;
  returnQuantity: number;
  returnRate: number;
}

export interface ProductsReportResponse {
  range: ReportRangeMeta;
  summary: {
    totalProductsSold: number;
    totalUnitsSold: number;
    grossProductRevenue: number;
    netProductRevenue: number;
    averageUnitsPerOrder: number;
  };
  items: ProductTableRow[];
  pagination: ReportPagination;
}

// 5. Categories Report
export interface CategoryTableRow {
  categoryId: string;
  categoryName: string;
  slug: string;
  unitsSold: number;
  ordersCount: number;
  grossRevenue: number;
  discountAmount: number;
  refundAmount: number;
  netRevenue: number;
  averageOrderValueContribution: number;
}

export interface CategoriesReportResponse {
  range: ReportRangeMeta;
  attributionNote: string;
  summary: {
    totalCategoriesWithSales: number;
    grossRevenue: number;
    netRevenue: number;
  };
  items: CategoryTableRow[];
  pagination: ReportPagination;
}

// 6. Brands Report
export interface BrandTableRow {
  brandId: string;
  brandName: string;
  slug: string;
  productsSold: number;
  unitsSold: number;
  grossRevenue: number;
  refundAmount: number;
  netRevenue: number;
  averageRating: number;
}

export interface BrandsReportResponse {
  range: ReportRangeMeta;
  attributionNote: string;
  summary: {
    totalBrandsWithSales: number;
    grossRevenue: number;
    netRevenue: number;
  };
  items: BrandTableRow[];
  pagination: ReportPagination;
}

// 7. Customers Report
export interface CustomersQuery extends AnalyticsBaseQuery {
  search?: string;
}

export interface CustomersSummary {
  totalCustomers: number;
  newCustomers: MetricComparison;
  customersWithOrders: MetricComparison;
  repeatCustomers: MetricComparison;
  repeatCustomerRate: number;
  averageOrdersPerCustomer: number;
  averageCustomerSpend: number;
}

export interface CustomerTableRow {
  customerId: string;
  displayName: string;
  email?: string;
  joinedAt: string;
  ordersCount: number;
  totalSpend: number;
  averageOrderValue: number;
  lastOrderAt?: string | null;
  refundAmount: number;
  returnCount: number;
}

export interface CustomersReportResponse {
  range: ReportRangeMeta;
  repeatDefinition: string;
  summary: CustomersSummary;
  trend: {
    period: string;
    newCustomers: number;
  }[];
  items: CustomerTableRow[];
  pagination: ReportPagination;
}

// 8. Inventory Report
export interface InventoryQuery extends AnalyticsBaseQuery {
  search?: string;
  lowStockOnly?: boolean;
}

export interface InventoryMovementSummary {
  stockInUnits: number;
  stockOutUnits: number;
  saleUnits: number;
  returnedUnits: number;
  adjustmentUnits: number;
  reservationUnits: number;
  releaseUnits: number;
}

export interface InventoryStockHealthSummary {
  totalVariants: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  averageAvailableStock: number;
}

export interface InventoryTableRow {
  variantId: string;
  productId: string;
  productName: string;
  variantName?: string;
  sku: string;
  stockIn: number;
  stockOut: number;
  sold: number;
  returned: number;
  adjustments: number;
  currentOnHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
}

export interface InventoryReportResponse {
  range: ReportRangeMeta;
  movementSummary: InventoryMovementSummary;
  stockHealth: InventoryStockHealthSummary;
  items: InventoryTableRow[];
  pagination: ReportPagination;
}

// 9. Returns Report
export interface ReturnsReportResponse {
  range: ReportRangeMeta;
  summary: {
    requests: MetricComparison;
    approved: MetricComparison;
    rejected: MetricComparison;
    completed: MetricComparison;
    returnedUnits: number;
    returnValue: number;
    unitReturnRate: number;
  };
  reasonsBreakdown: {
    reasonCategory: string;
    count: number;
    quantity: number;
    refundAmount: number;
    percentage: number;
  }[];
  items: {
    id: string;
    returnNumber: string;
    orderNumber: string;
    customerName: string;
    status: string;
    reasonCategory: string;
    units: number;
    refundAmount: number;
    createdAt: string;
  }[];
  pagination: ReportPagination;
}

// 10. Refunds Report
export interface RefundsReportResponse {
  range: ReportRangeMeta;
  summary: {
    refundCount: MetricComparison;
    refundAmount: MetricComparison;
    successfulRefunds: MetricComparison;
    failedRefunds: MetricComparison;
    pendingRefunds: MetricComparison;
    averageRefundAmount: number;
  };
  methodBreakdown: {
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  failureBreakdown: {
    failureCode: string;
    count: number;
  }[];
  items: {
    id: string;
    refundNumber: string;
    orderNumber: string;
    amount: number;
    status: string;
    method: string;
    reason: string;
    createdAt: string;
  }[];
  pagination: ReportPagination;
}

// 11. Promotions & Coupons Report
export interface CouponPerformanceTableRow {
  couponCode: string;
  name: string;
  discountType: string;
  discountValue: number;
  redemptions: number;
  uniqueCustomers: number;
  discountGranted: number;
  ordersRevenue: number;
  averageOrderValue: number;
}

export interface PromotionPerformanceTableRow {
  promotionName: string;
  discountType: string;
  discountValue: number;
  ordersCount: number;
  discountGranted: number;
  revenue: number;
}

export interface PromotionsReportResponse {
  range: ReportRangeMeta;
  summary: {
    couponRedemptions: MetricComparison;
    couponOrders: MetricComparison;
    couponDiscountAmount: MetricComparison;
    averageCouponDiscount: number;
    promotionOrders: MetricComparison;
    promotionDiscountAmount: MetricComparison;
  };
  coupons: CouponPerformanceTableRow[];
  promotions: PromotionPerformanceTableRow[];
  pagination: ReportPagination;
}

// 12. Shipping Report
export interface ShippingCarrierBreakdownPoint {
  carrier: string;
  shipments: number;
  delivered: number;
  failed: number;
  averageDeliveryHours: number;
}

export interface ShippingReportResponse {
  range: ReportRangeMeta;
  summary: {
    totalShipments: MetricComparison;
    deliveredShipments: MetricComparison;
    failedShipments: MetricComparison;
    averageDeliveryHours: number;
    shippingRevenue: MetricComparison;
  };
  carrierBreakdown: ShippingCarrierBreakdownPoint[];
  methodBreakdown: {
    code: string;
    name: string;
    ordersCount: number;
    shippingRevenue: number;
    averageFee: number;
  }[];
  items: {
    id: string;
    shipmentNumber: string;
    orderNumber: string;
    carrier: string;
    status: string;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    deliveryDurationHours?: number | null;
    fee: number;
  }[];
  pagination: ReportPagination;
}

// 13. Reviews Report
export interface RatingDistributionPoint {
  rating: number;
  count: number;
  percentage: number;
}

export interface ReviewsReportResponse {
  range: ReportRangeMeta;
  summary: {
    totalReviews: MetricComparison;
    publishedReviews: MetricComparison;
    hiddenReviews: MetricComparison;
    rejectedReviews: MetricComparison;
    averageRating: number;
    verifiedPurchaseRate: number;
  };
  ratingDistribution: RatingDistributionPoint[];
  topRatedProducts: {
    productId: string;
    productName: string;
    averageRating: number;
    reviewCount: number;
  }[];
  lowestRatedProducts: {
    productId: string;
    productName: string;
    averageRating: number;
    reviewCount: number;
  }[];
}
