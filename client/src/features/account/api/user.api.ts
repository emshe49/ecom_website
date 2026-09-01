import api from '../../../services/api';
import { User, UpdateProfileInput } from '../types/account.types';

export const userApi = {
  getProfile: async (): Promise<User> => {
    const response = await api.get<{ success: boolean; data: { user: User } }>('/users/me');
    return response.data.data.user;
  },

  updateProfile: async (data: UpdateProfileInput): Promise<User> => {
    const response = await api.patch<{ success: boolean; data: { user: User } }>('/users/me', data);
    return response.data.data.user;
  },
};
