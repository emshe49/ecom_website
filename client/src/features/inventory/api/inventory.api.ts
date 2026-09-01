import api from '../../../services/api';
import {
  InventoryItem,
  InventoryListResponse,
  InventoryDetailResponse,
  InventoryTransactionsResponse,
  StockAdjustmentPayload,
  UpdateThresholdPayload,
  InventoryFilterParams,
} from '../types/inventory.types';

export const inventoryApi = {
  getInventoryList: async (
    params?: InventoryFilterParams
  ): Promise<InventoryListResponse> => {
    const response = await api.get<{
      success: boolean;
      data: InventoryListResponse;
    }>('/admin/inventory', { params });
    return response.data.data;
  },

  getInventoryDetail: async (
    variantId: string
  ): Promise<InventoryDetailResponse['inventory']> => {
    const response = await api.get<{
      success: boolean;
      data: InventoryDetailResponse;
    }>(`/admin/inventory/${variantId}`);
    return response.data.data.inventory;
  },

  adjustStock: async (
    variantId: string,
    payload: StockAdjustmentPayload
  ): Promise<{ inventory: InventoryItem; message: string }> => {
    const response = await api.post<{
      success: boolean;
      data: { inventory: InventoryItem; message: string };
    }>(`/admin/inventory/${variantId}/adjust`, payload);
    return response.data.data;
  },

  updateThreshold: async (
    variantId: string,
    payload: UpdateThresholdPayload
  ): Promise<{ inventory: InventoryItem; message: string }> => {
    const response = await api.patch<{
      success: boolean;
      data: { inventory: InventoryItem; message: string };
    }>(`/admin/inventory/${variantId}/threshold`, payload);
    return response.data.data;
  },

  getVariantTransactions: async (
    variantId: string,
    params?: { page?: number; limit?: number; type?: string }
  ): Promise<InventoryTransactionsResponse> => {
    const response = await api.get<{
      success: boolean;
      data: InventoryTransactionsResponse;
    }>(`/admin/inventory/${variantId}/transactions`, { params });
    return response.data.data;
  },

  getAllTransactions: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<InventoryTransactionsResponse> => {
    const response = await api.get<{
      success: boolean;
      data: InventoryTransactionsResponse;
    }>('/admin/inventory/transactions', { params });
    return response.data.data;
  },
};
