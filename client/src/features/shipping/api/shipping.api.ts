import api from '../../../services/api';
import {
  ShippingQuoteResponseDTO,
  CustomerShipmentDTO,
  ShippingMethodDTO,
  CreateShippingMethodInput,
  UpdateShippingMethodInput,
  AdminShipmentSummaryDTO,
  AdminShipmentDetailDTO,
  CreateShipmentInput,
  UpdateShipmentStatusInput,
  UpdateShipmentTrackingInput,
  AdminShipmentQueryFilters,
} from '../types/shipping.types';

export const shippingApi = {
  // ==========================================
  // Customer Endpoints
  // ==========================================

  /**
   * Fetch eligible shipping methods & authoritative quote for the current active cart.
   */
  getQuote: async (shippingAddressId: string): Promise<ShippingQuoteResponseDTO> => {
    const response = await api.post<{
      success: boolean;
      data: ShippingQuoteResponseDTO;
    }>('/shipping/quote', { shippingAddressId });
    return response.data.data;
  },

  /**
   * Fetch customer-safe tracking details for an order.
   */
  getOrderShipment: async (orderId: string): Promise<CustomerShipmentDTO> => {
    const response = await api.get<{
      success: boolean;
      data: CustomerShipmentDTO;
    }>(`/shipping/orders/${orderId}/shipment`);
    return response.data.data;
  },

  // ==========================================
  // Admin Shipping Methods Management
  // ==========================================

  listShippingMethods: async (params?: {
    activeOnly?: boolean;
    search?: string;
  }): Promise<ShippingMethodDTO[]> => {
    const response = await api.get<{
      success: boolean;
      data: ShippingMethodDTO[];
    }>('/admin/shipping-methods', { params });
    return response.data.data;
  },

  getShippingMethodById: async (id: string): Promise<ShippingMethodDTO> => {
    const response = await api.get<{
      success: boolean;
      data: ShippingMethodDTO;
    }>(`/admin/shipping-methods/${id}`);
    return response.data.data;
  },

  createShippingMethod: async (
    input: CreateShippingMethodInput
  ): Promise<ShippingMethodDTO> => {
    const response = await api.post<{
      success: boolean;
      data: ShippingMethodDTO;
    }>('/admin/shipping-methods', input);
    return response.data.data;
  },

  updateShippingMethod: async (
    id: string,
    input: UpdateShippingMethodInput
  ): Promise<ShippingMethodDTO> => {
    const response = await api.put<{
      success: boolean;
      data: ShippingMethodDTO;
    }>(`/admin/shipping-methods/${id}`, input);
    return response.data.data;
  },

  deactivateShippingMethod: async (id: string): Promise<ShippingMethodDTO> => {
    const response = await api.delete<{
      success: boolean;
      data: ShippingMethodDTO;
    }>(`/admin/shipping-methods/${id}`);
    return response.data.data;
  },

  // ==========================================
  // Admin Shipments & Fulfillment Management
  // ==========================================

  listShipments: async (
    filters: AdminShipmentQueryFilters = {}
  ): Promise<{
    shipments: AdminShipmentSummaryDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const response = await api.get<{
      success: boolean;
      data: AdminShipmentSummaryDTO[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>('/admin/shipments', { params: filters });
    return {
      shipments: response.data.data,
      pagination: response.data.pagination,
    };
  },

  getShipmentById: async (shipmentId: string): Promise<AdminShipmentDetailDTO> => {
    const response = await api.get<{
      success: boolean;
      data: AdminShipmentDetailDTO;
    }>(`/admin/shipments/${shipmentId}`);
    return response.data.data;
  },

  getShipmentByOrderId: async (orderId: string): Promise<AdminShipmentDetailDTO> => {
    const response = await api.get<{
      success: boolean;
      data: AdminShipmentDetailDTO;
    }>(`/admin/shipments/order/${orderId}`);
    return response.data.data;
  },

  createShipmentForOrder: async (
    orderId: string,
    input: CreateShipmentInput
  ): Promise<AdminShipmentDetailDTO> => {
    const response = await api.post<{
      success: boolean;
      data: AdminShipmentDetailDTO;
    }>(`/admin/shipments/order/${orderId}`, input);
    return response.data.data;
  },

  updateShipmentStatus: async (
    shipmentId: string,
    input: UpdateShipmentStatusInput
  ): Promise<AdminShipmentDetailDTO> => {
    const response = await api.put<{
      success: boolean;
      data: AdminShipmentDetailDTO;
    }>(`/admin/shipments/${shipmentId}/status`, input);
    return response.data.data;
  },

  updateShipmentTracking: async (
    shipmentId: string,
    input: UpdateShipmentTrackingInput
  ): Promise<AdminShipmentDetailDTO> => {
    const response = await api.put<{
      success: boolean;
      data: AdminShipmentDetailDTO;
    }>(`/admin/shipments/${shipmentId}/tracking`, input);
    return response.data.data;
  },

  cancelShipment: async (
    shipmentId: string,
    note?: string
  ): Promise<AdminShipmentDetailDTO> => {
    const response = await api.post<{
      success: boolean;
      data: AdminShipmentDetailDTO;
    }>(`/admin/shipments/${shipmentId}/cancel`, { note });
    return response.data.data;
  },
};
