import api from '../../../services/api';
import {
  OrderDetailDTO,
  OrderListItemDTO,
  AdminOrderDetailDTO,
  AdminOrderListItemDTO,
  PaginationMeta,
  CreateOrderPayload,
  CancelOrderPayload,
  UpdateOrderStatusPayload,
  UpdateInternalNotesPayload,
} from '../orders.types';

export interface CustomerOrdersQuery {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminOrdersQuery extends CustomerOrdersQuery {
  search?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export const ordersApi = {
  // Customer APIs
  createOrder: async (payload: CreateOrderPayload = {}): Promise<OrderDetailDTO> => {
    const response = await api.post<{ success: boolean; data: { order: OrderDetailDTO } }>(
      '/orders',
      payload
    );
    return response.data.data.order;
  },

  getMyOrders: async (
    query: CustomerOrdersQuery = {}
  ): Promise<{ orders: OrderListItemDTO[]; pagination: PaginationMeta }> => {
    const response = await api.get<{
      success: boolean;
      data: { orders: OrderListItemDTO[]; pagination: PaginationMeta };
    }>('/orders', { params: query });
    return response.data.data;
  },

  getMyOrderById: async (orderId: string): Promise<OrderDetailDTO> => {
    const response = await api.get<{ success: boolean; data: { order: OrderDetailDTO } }>(
      `/orders/${orderId}`
    );
    return response.data.data.order;
  },

  cancelMyOrder: async (
    orderId: string,
    payload: CancelOrderPayload = {}
  ): Promise<OrderDetailDTO> => {
    const response = await api.post<{ success: boolean; data: { order: OrderDetailDTO } }>(
      `/orders/${orderId}/cancel`,
      payload
    );
    return response.data.data.order;
  },

  // Admin APIs
  getAdminOrders: async (
    query: AdminOrdersQuery = {}
  ): Promise<{ orders: AdminOrderListItemDTO[]; pagination: PaginationMeta }> => {
    const response = await api.get<{
      success: boolean;
      data: { orders: AdminOrderListItemDTO[]; pagination: PaginationMeta };
    }>('/admin/orders', { params: query });
    return response.data.data;
  },

  getAdminOrderById: async (orderId: string): Promise<AdminOrderDetailDTO> => {
    const response = await api.get<{ success: boolean; data: { order: AdminOrderDetailDTO } }>(
      `/admin/orders/${orderId}`
    );
    return response.data.data.order;
  },

  updateAdminOrderStatus: async (
    orderId: string,
    payload: UpdateOrderStatusPayload
  ): Promise<AdminOrderDetailDTO> => {
    const response = await api.patch<{ success: boolean; data: { order: AdminOrderDetailDTO } }>(
      `/admin/orders/${orderId}/status`,
      payload
    );
    return response.data.data.order;
  },

  cancelAdminOrder: async (
    orderId: string,
    payload: CancelOrderPayload = {}
  ): Promise<AdminOrderDetailDTO> => {
    const response = await api.post<{ success: boolean; data: { order: AdminOrderDetailDTO } }>(
      `/admin/orders/${orderId}/cancel`,
      payload
    );
    return response.data.data.order;
  },

  updateAdminInternalNotes: async (
    orderId: string,
    payload: UpdateInternalNotesPayload
  ): Promise<AdminOrderDetailDTO> => {
    const response = await api.patch<{ success: boolean; data: { order: AdminOrderDetailDTO } }>(
      `/admin/orders/${orderId}/internal-note`,
      payload
    );
    return response.data.data.order;
  },
};
