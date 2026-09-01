import { api } from '../../../services/api';
import {
  Brand,
  PaginatedBrands,
  CreateBrandInput,
  UpdateBrandInput,
} from '../types/catalog.types';

export interface BrandQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const brandApi = {
  // Admin API
  listAdmin: async (params?: BrandQueryParams): Promise<PaginatedBrands> => {
    const response = await api.get<{ success: true; data: PaginatedBrands }>(
      '/admin/brands',
      { params }
    );
    return response.data.data;
  },

  getAdminById: async (id: string): Promise<Brand> => {
    const response = await api.get<{ success: true; data: { brand: Brand } }>(
      `/admin/brands/${id}`
    );
    return response.data.data.brand;
  },

  create: async (data: CreateBrandInput): Promise<Brand> => {
    const response = await api.post<{ success: true; data: { brand: Brand } }>(
      '/admin/brands',
      data
    );
    return response.data.data.brand;
  },

  update: async (id: string, data: UpdateBrandInput): Promise<Brand> => {
    const response = await api.patch<{ success: true; data: { brand: Brand } }>(
      `/admin/brands/${id}`,
      data
    );
    return response.data.data.brand;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/brands/${id}`);
  },

  // Public API
  listPublic: async (params?: BrandQueryParams): Promise<PaginatedBrands> => {
    const response = await api.get<{ success: true; data: PaginatedBrands }>(
      '/brands',
      { params }
    );
    return response.data.data;
  },

  getBySlug: async (slug: string): Promise<Brand> => {
    const response = await api.get<{ success: true; data: { brand: Brand } }>(
      `/brands/${slug}`
    );
    return response.data.data.brand;
  },
};
