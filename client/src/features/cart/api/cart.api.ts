import api from '../../../services/api';
import {
  Cart,
  AddToCartPayload,
  UpdateCartItemPayload,
} from '../types/cart.types';

export const cartApi = {
  getCart: async (): Promise<Cart> => {
    const response = await api.get<{
      success: boolean;
      data: { cart: Cart };
    }>('/cart');
    return response.data.data.cart;
  },

  addToCart: async (payload: AddToCartPayload): Promise<Cart> => {
    const response = await api.post<{
      success: boolean;
      data: { cart: Cart };
    }>('/cart/items', payload);
    return response.data.data.cart;
  },

  updateCartItem: async (
    variantId: string,
    payload: UpdateCartItemPayload
  ): Promise<Cart> => {
    const response = await api.patch<{
      success: boolean;
      data: { cart: Cart };
    }>(`/cart/items/${variantId}`, payload);
    return response.data.data.cart;
  },

  removeCartItem: async (variantId: string): Promise<Cart> => {
    const response = await api.delete<{
      success: boolean;
      data: { cart: Cart };
    }>(`/cart/items/${variantId}`);
    return response.data.data.cart;
  },

  clearCart: async (): Promise<Cart> => {
    const response = await api.delete<{
      success: boolean;
      data: { cart: Cart };
    }>('/cart');
    return response.data.data.cart;
  },
};
