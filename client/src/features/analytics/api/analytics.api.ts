import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import {
  AnalyticsFilterParams,
  SalesReportResponse,
  OrdersReportResponse,
  PaymentsReportResponse,
  ProductsReportResponse,
  CategoriesReportResponse,
  BrandsReportResponse,
  CustomersReportResponse,
  InventoryReportResponse,
  ReturnsReportResponse,
  RefundsReportResponse,
  PromotionsReportResponse,
  ShippingReportResponse,
  ReviewsReportResponse,
} from '../types/analytics.types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// Utility to clean empty params
function cleanParams(params: AnalyticsFilterParams) {
  const result: Record<string, any> = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val;
    }
  });
  return result;
}

// 1. Sales API
export const analyticsApi = {
  getSales: async (params: AnalyticsFilterParams): Promise<SalesReportResponse> => {
    const res = await api.get<ApiResponse<SalesReportResponse>>('/admin/analytics/sales', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportSalesCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/sales/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 2. Orders API
  getOrders: async (params: AnalyticsFilterParams): Promise<OrdersReportResponse> => {
    const res = await api.get<ApiResponse<OrdersReportResponse>>('/admin/analytics/orders', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportOrdersCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/orders/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 3. Payments API
  getPayments: async (params: AnalyticsFilterParams): Promise<PaymentsReportResponse> => {
    const res = await api.get<ApiResponse<PaymentsReportResponse>>('/admin/analytics/payments', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportPaymentsCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/payments/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 4. Products API
  getProducts: async (params: AnalyticsFilterParams): Promise<ProductsReportResponse> => {
    const res = await api.get<ApiResponse<ProductsReportResponse>>('/admin/analytics/products', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportProductsCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/products/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 5. Categories API
  getCategories: async (params: AnalyticsFilterParams): Promise<CategoriesReportResponse> => {
    const res = await api.get<ApiResponse<CategoriesReportResponse>>('/admin/analytics/categories', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportCategoriesCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/categories/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 6. Brands API
  getBrands: async (params: AnalyticsFilterParams): Promise<BrandsReportResponse> => {
    const res = await api.get<ApiResponse<BrandsReportResponse>>('/admin/analytics/brands', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportBrandsCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/brands/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 7. Customers API
  getCustomers: async (params: AnalyticsFilterParams): Promise<CustomersReportResponse> => {
    const res = await api.get<ApiResponse<CustomersReportResponse>>('/admin/analytics/customers', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportCustomersCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/customers/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 8. Inventory API
  getInventory: async (params: AnalyticsFilterParams): Promise<InventoryReportResponse> => {
    const res = await api.get<ApiResponse<InventoryReportResponse>>('/admin/analytics/inventory', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportInventoryCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/inventory/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 9. Returns API
  getReturns: async (params: AnalyticsFilterParams): Promise<ReturnsReportResponse> => {
    const res = await api.get<ApiResponse<ReturnsReportResponse>>('/admin/analytics/returns', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportReturnsCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/returns/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 10. Refunds API
  getRefunds: async (params: AnalyticsFilterParams): Promise<RefundsReportResponse> => {
    const res = await api.get<ApiResponse<RefundsReportResponse>>('/admin/analytics/refunds', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  exportRefundsCsv: async (params: AnalyticsFilterParams): Promise<Blob> => {
    const res = await api.get('/admin/analytics/refunds/export', {
      params: cleanParams(params),
      responseType: 'blob',
    });
    return res.data;
  },

  // 11. Promotions API
  getPromotions: async (params: AnalyticsFilterParams): Promise<PromotionsReportResponse> => {
    const res = await api.get<ApiResponse<PromotionsReportResponse>>('/admin/analytics/promotions', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  // 12. Shipping API
  getShipping: async (params: AnalyticsFilterParams): Promise<ShippingReportResponse> => {
    const res = await api.get<ApiResponse<ShippingReportResponse>>('/admin/analytics/shipping', {
      params: cleanParams(params),
    });
    return res.data.data;
  },

  // 13. Reviews API
  getReviews: async (params: AnalyticsFilterParams): Promise<ReviewsReportResponse> => {
    const res = await api.get<ApiResponse<ReviewsReportResponse>>('/admin/analytics/reviews', {
      params: cleanParams(params),
    });
    return res.data.data;
  },
};

// TanStack Query Custom Hooks
export const useSalesAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'sales', params],
    queryFn: () => analyticsApi.getSales(params),
  });

export const useOrdersAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'orders', params],
    queryFn: () => analyticsApi.getOrders(params),
  });

export const usePaymentsAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'payments', params],
    queryFn: () => analyticsApi.getPayments(params),
  });

export const useProductsAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'products', params],
    queryFn: () => analyticsApi.getProducts(params),
  });

export const useCategoriesAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'categories', params],
    queryFn: () => analyticsApi.getCategories(params),
  });

export const useBrandsAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'brands', params],
    queryFn: () => analyticsApi.getBrands(params),
  });

export const useCustomersAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'customers', params],
    queryFn: () => analyticsApi.getCustomers(params),
  });

export const useInventoryAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'inventory', params],
    queryFn: () => analyticsApi.getInventory(params),
  });

export const useReturnsAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'returns', params],
    queryFn: () => analyticsApi.getReturns(params),
  });

export const useRefundsAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'refunds', params],
    queryFn: () => analyticsApi.getRefunds(params),
  });

export const usePromotionsAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'promotions', params],
    queryFn: () => analyticsApi.getPromotions(params),
  });

export const useShippingAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'shipping', params],
    queryFn: () => analyticsApi.getShipping(params),
  });

export const useReviewsAnalytics = (params: AnalyticsFilterParams) =>
  useQuery({
    queryKey: ['analytics', 'reviews', params],
    queryFn: () => analyticsApi.getReviews(params),
  });

/**
 * Helper to download Blob as CSV file in the browser
 */
export const downloadCsvBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
