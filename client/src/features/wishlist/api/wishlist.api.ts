import api from '../../../services/api';
import { Wishlist } from '../types/wishlist.types';

export const wishlistApi = {
  getWishlist: async (): Promise<Wishlist> => {
    const response = await api.get<{
      success: boolean;
      data: { wishlist: Wishlist };
    }>('/wishlist');
    return response.data.data.wishlist;
  },

  addItem: async (productId: string): Promise<Wishlist> => {
    const response = await api.post<{
      success: boolean;
      data: { wishlist: Wishlist };
    }>('/wishlist/items', { productId });
    return response.data.data.wishlist;
  },

  removeItem: async (productId: string): Promise<Wishlist> => {
    const response = await api.delete<{
      success: boolean;
      data: { wishlist: Wishlist };
    }>(`/wishlist/items/${productId}`);
    return response.data.data.wishlist;
  },

  clearWishlist: async (): Promise<Wishlist> => {
    const response = await api.delete<{
      success: boolean;
      data: { wishlist: Wishlist };
    }>('/wishlist');
    return response.data.data.wishlist;
  },
};
