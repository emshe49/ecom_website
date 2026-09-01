import { api } from '../../../services/api';
import {
  ProductSearchResponse,
  ProductFacetResponse,
} from '../types/product-search.types';
import { ProductDetail } from '../../products/types/product.types';

export interface ProductSearchApiParams {
  search?: string;
  category?: string;
  categoryId?: string;
  brand?: string | string[];
  brandId?: string | string[];
  minPrice?: number; // minor units
  maxPrice?: number; // minor units
  featured?: boolean;
  attribute?: string[];
  spec?: string[];
  sort?: string;
  page?: number;
  limit?: number;
}

export const productSearchApi = {
  getProducts: async (params?: ProductSearchApiParams): Promise<ProductSearchResponse> => {
    const response = await api.get<{ success: true; data: ProductSearchResponse }>('/products', {
      params,
    });
    return response.data.data;
  },

  getProductFacets: async (params?: {
    search?: string;
    category?: string;
    brand?: string | string[];
  }): Promise<ProductFacetResponse> => {
    const response = await api.get<{ success: true; data: ProductFacetResponse }>(
      '/products/facets',
      { params }
    );
    return response.data.data;
  },

  getProductBySlug: async (slug: string): Promise<ProductDetail> => {
    const response = await api.get<{ success: true; data: { product: ProductDetail } }>(
      `/products/${slug}`
    );
    return response.data.data.product;
  },
};
