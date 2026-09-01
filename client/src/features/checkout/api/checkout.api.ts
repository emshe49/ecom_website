import api from '../../../services/api';
import { CheckoutSession, CreateCheckoutInput } from '../types/checkout.types';

export const checkoutApi = {
  createCheckout: async (input: CreateCheckoutInput): Promise<CheckoutSession> => {
    const response = await api.post<{ success: boolean; data: CheckoutSession }>(
      '/checkout',
      input
    );
    return response.data.data;
  },

  getActiveCheckout: async (): Promise<CheckoutSession> => {
    const response = await api.get<{ success: boolean; data: CheckoutSession }>(
      '/checkout'
    );
    return response.data.data;
  },

  revalidateCheckout: async (): Promise<CheckoutSession> => {
    const response = await api.post<{ success: boolean; data: CheckoutSession }>(
      '/checkout/revalidate'
    );
    return response.data.data;
  },

  cancelCheckout: async (): Promise<{ message: string }> => {
    const response = await api.delete<{ success: boolean; data: { message: string } }>(
      '/checkout'
    );
    return response.data.data;
  },
};


