import { api } from '../../../services/api';
import {
  Product,
  ProductDetail,
  ProductVariant,
  PaginatedProducts,
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput,
  ProductStatus,
} from '../types/product.types';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  brandId?: string;
  featured?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const productApi = {
  // Admin Product APIs
  listAdmin: async (params?: ProductQueryParams): Promise<PaginatedProducts> => {
    const response = await api.get<{ success: true; data: PaginatedProducts }>(
      '/admin/products',
      { params }
    );
    return response.data.data;
  },

  getAdminById: async (id: string): Promise<ProductDetail> => {
    const response = await api.get<{ success: true; data: { product: ProductDetail } }>(
      `/admin/products/${id}`
    );
    return response.data.data.product;
  },

  create: async (data: CreateProductInput): Promise<Product> => {
    const response = await api.post<{ success: true; data: { product: Product } }>(
      '/admin/products',
      data
    );
    return response.data.data.product;
  },

  update: async (id: string, data: UpdateProductInput): Promise<ProductDetail> => {
    const response = await api.patch<{ success: true; data: { product: ProductDetail } }>(
      `/admin/products/${id}`,
      data
    );
    return response.data.data.product;
  },

  updateStatus: async (id: string, status: ProductStatus): Promise<ProductDetail> => {
    const response = await api.patch<{ success: true; data: { product: ProductDetail } }>(
      `/admin/products/${id}/status`,
      { status }
    );
    return response.data.data.product;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/products/${id}`);
  },

  // Admin Variant APIs
  listVariants: async (productId: string): Promise<ProductVariant[]> => {
    const response = await api.get<{ success: true; data: { variants: ProductVariant[] } }>(
      `/admin/products/${productId}/variants`
    );
    return response.data.data.variants;
  },

  createVariant: async (productId: string, data: CreateVariantInput): Promise<ProductVariant> => {
    const response = await api.post<{ success: true; data: { variant: ProductVariant } }>(
      `/admin/products/${productId}/variants`,
      data
    );
    return response.data.data.variant;
  },

  updateVariant: async (
    productId: string,
    variantId: string,
    data: UpdateVariantInput
  ): Promise<ProductVariant> => {
    const response = await api.patch<{ success: true; data: { variant: ProductVariant } }>(
      `/admin/products/${productId}/variants/${variantId}`,
      data
    );
    return response.data.data.variant;
  },

  deleteVariant: async (productId: string, variantId: string): Promise<void> => {
    await api.delete(`/admin/products/${productId}/variants/${variantId}`);
  },

  // Public Product APIs
  listPublic: async (params?: ProductQueryParams): Promise<PaginatedProducts> => {
    const response = await api.get<{ success: true; data: PaginatedProducts }>(
      '/products',
      { params }
    );
    return response.data.data;
  },

  getBySlug: async (slug: string): Promise<ProductDetail> => {
    const response = await api.get<{ success: true; data: { product: ProductDetail } }>(
      `/products/${slug}`
    );
    return response.data.data.product;
  },
};
