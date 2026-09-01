import { api } from '../../../services/api';
import {
  StaffUser,
  CreateStaffInput,
  UpdateStaffRoleInput,
  UpdateStaffStatusInput,
} from '../types/admin.types';

export const adminUsersApi = {
  listStaff: async (): Promise<StaffUser[]> => {
    const response = await api.get<{ success: true; data: { users: StaffUser[] } }>(
      '/admin/users'
    );
    return response.data.data.users;
  },

  createStaff: async (data: CreateStaffInput): Promise<StaffUser> => {
    const response = await api.post<{ success: true; data: { user: StaffUser } }>(
      '/admin/users',
      data
    );
    return response.data.data.user;
  },

  updateStaffRole: async (userId: string, data: UpdateStaffRoleInput): Promise<StaffUser> => {
    const response = await api.patch<{ success: true; data: { user: StaffUser } }>(
      `/admin/users/${userId}/role`,
      data
    );
    return response.data.data.user;
  },

  updateStaffStatus: async (
    userId: string,
    data: UpdateStaffStatusInput
  ): Promise<StaffUser> => {
    const response = await api.patch<{ success: true; data: { user: StaffUser } }>(
      `/admin/users/${userId}/status`,
      data
    );
    return response.data.data.user;
  },
};
