export const ANALYTICS_GROUP_BY = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
} as const;

export type AnalyticsGroupBy =
  (typeof ANALYTICS_GROUP_BY)[keyof typeof ANALYTICS_GROUP_BY];

export const ANALYTICS_CONSTANTS = {
  DEFAULT_RANGE_DAYS: 30,
  MAX_RANGE_DAYS: 1095, // 3 years max
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MAX_EXPORT_ROWS: 50000,
  MIN_REVIEWS_FOR_TOP_RATED: 3,
} as const;

export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SORT_ORDERS)[keyof typeof SORT_ORDERS];

export const REPORT_SORT_WHITELISTS = {
  sales: ['period', 'ordersCount', 'itemsSold', 'grossRevenue', 'discountAmount', 'refundAmount', 'netRevenue', 'averageOrderValue'],
  orders: ['placedAt', 'orderNumber', 'total', 'subtotal', 'discountAmount', 'shippingFee', 'status', 'paymentStatus'],
  payments: ['createdAt', 'paymentNumber', 'amount', 'status', 'method', 'provider'],
  products: ['unitsSold', 'grossRevenue', 'netRevenue', 'refundAmount', 'discountAllocated', 'ordersCount', 'returnQuantity', 'returnRate', 'averageRating', 'reviewCount', 'productName'],
  categories: ['unitsSold', 'ordersCount', 'grossRevenue', 'discountAmount', 'refundAmount', 'netRevenue', 'categoryName'],
  brands: ['productsSold', 'unitsSold', 'grossRevenue', 'refundAmount', 'netRevenue', 'averageRating', 'brandName'],
  customers: ['joinedAt', 'ordersCount', 'totalSpend', 'averageOrderValue', 'lastOrderAt', 'refundAmount', 'displayName'],
  inventory: ['currentOnHand', 'reserved', 'available', 'stockIn', 'stockOut', 'sold', 'returned', 'adjustments', 'productName', 'sku'],
  returns: ['createdAt', 'returnNumber', 'units', 'status', 'reasonCategory'],
  refunds: ['createdAt', 'refundNumber', 'amount', 'status', 'method', 'provider'],
  promotions: ['code', 'name', 'redemptions', 'uniqueCustomers', 'discountGranted', 'ordersRevenue', 'averageOrderValue'],
  shipping: ['createdAt', 'carrier', 'service', 'status', 'averageDeliveryTime', 'shippingRevenue'],
  reviews: ['createdAt', 'rating', 'reviewCount', 'averageRating', 'productName'],
} as const;
