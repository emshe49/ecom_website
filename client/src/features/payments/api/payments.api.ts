import api from '../../../services/api';
import {
  PaymentDTO,
  InitiatePaymentResultDTO,
  AdminPaymentListItemDTO,
  AdminPaymentDetailDTO,
  PaymentMethodOption,
  PaymentQueryFilters,
  PaymentMethod,
} from '../payments.types';

export const paymentsApi = {
  /**
   * Public: Get available payment methods.
   */
  getPaymentMethods: async (): Promise<PaymentMethodOption[]> => {
    const response = await api.get<{
      success: boolean;
      data: { methods: PaymentMethodOption[] };
    }>('/payments/methods');
    return response.data.data.methods;
  },

  /**
   * Customer: Initiate Payment for an order.
   */
  initiatePayment: async (payload: {
    orderId: string;
    method: PaymentMethod;
    returnUrl?: string;
  }): Promise<InitiatePaymentResultDTO> => {
    const response = await api.post<{
      success: boolean;
      data: InitiatePaymentResultDTO;
    }>('/payments', payload);
    return response.data.data;
  },

  /**
   * Customer: Get payment status & history for an order.
   */
  getPaymentByOrderId: async (orderId: string): Promise<PaymentDTO | null> => {
    const response = await api.get<{
      success: boolean;
      data: PaymentDTO | null;
    }>(`/payments/order/${orderId}`);
    return response.data.data;
  },

  /**
   * Admin: List payments with filters & pagination.
   */
  listAdminPayments: async (
    query: PaymentQueryFilters = {}
  ): Promise<{
    payments: AdminPaymentListItemDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const response = await api.get<{
      success: boolean;
      data: AdminPaymentListItemDTO[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>('/admin/payments', { params: query });
    return {
      payments: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /**
   * Admin: Get payment full details & attempts history.
   */
  getAdminPaymentById: async (paymentId: string): Promise<AdminPaymentDetailDTO> => {
    const response = await api.get<{
      success: boolean;
      data: AdminPaymentDetailDTO;
    }>(`/admin/payments/${paymentId}`);
    return response.data.data;
  },

  /**
   * Admin: Confirm Cash on Delivery collection.
   */
  confirmCodPayment: async (
    paymentId: string,
    payload: { note?: string } = {}
  ): Promise<AdminPaymentDetailDTO> => {
    const response = await api.post<{
      success: boolean;
      data: AdminPaymentDetailDTO;
    }>(`/admin/payments/${paymentId}/confirm-cod`, payload);
    return response.data.data;
  },

  /**
   * Admin: Reconcile payment with provider.
   */
  reconcilePayment: async (paymentId: string): Promise<AdminPaymentDetailDTO> => {
    const response = await api.post<{
      success: boolean;
      data: AdminPaymentDetailDTO;
    }>(`/admin/payments/${paymentId}/reconcile`);
    return response.data.data;
  },
};
