import { api } from '../../../services/api';
import {
  Category,
  CategoryTreeNode,
  PaginatedCategories,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../types/catalog.types';

export interface CategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  parentId?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const categoryApi = {
  // Admin API
  listAdmin: async (params?: CategoryQueryParams): Promise<PaginatedCategories> => {
    const response = await api.get<{ success: true; data: PaginatedCategories }>(
      '/admin/categories',
      { params }
    );
    return response.data.data;
  },

  getAdminById: async (id: string): Promise<Category> => {
    const response = await api.get<{ success: true; data: { category: Category } }>(
      `/admin/categories/${id}`
    );
    return response.data.data.category;
  },

  create: async (data: CreateCategoryInput): Promise<Category> => {
    const response = await api.post<{ success: true; data: { category: Category } }>(
      '/admin/categories',
      data
    );
    return response.data.data.category;
  },

  update: async (id: string, data: UpdateCategoryInput): Promise<Category> => {
    const response = await api.patch<{ success: true; data: { category: Category } }>(
      `/admin/categories/${id}`,
      data
    );
    return response.data.data.category;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/categories/${id}`);
  },

  // Public API
  listPublic: async (params?: CategoryQueryParams): Promise<PaginatedCategories> => {
    const response = await api.get<{ success: true; data: PaginatedCategories }>(
      '/categories',
      { params }
    );
    return response.data.data;
  },

  getTree: async (): Promise<CategoryTreeNode[]> => {
    const response = await api.get<{ success: true; data: { tree: CategoryTreeNode[] } }>(
      '/categories/tree'
    );
    return response.data.data.tree;
  },

  getBySlug: async (slug: string): Promise<Category> => {
    const response = await api.get<{ success: true; data: { category: Category } }>(
      `/categories/${slug}`
    );
    return response.data.data.category;
  },
};
