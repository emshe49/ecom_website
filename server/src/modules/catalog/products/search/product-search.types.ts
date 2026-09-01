import { PriceRangeDTO, ProductImageDTO } from '../product.types.js';

export type ProductSortOption =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'price-asc'
  | 'price-desc'
  | 'featured';

export interface AttributeFilter {
  name: string;
  values: string[];
}

export interface ProductSearchQuery {
  search?: string;
  category?: string;
  categoryId?: string;
  brand?: string | string[];
  brandId?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  attribute?: string | string[]; // e.g. "color:black", "size:large"
  spec?: string | string[]; // e.g. "material:cotton"
  sort?: ProductSortOption;
  page?: number;
  limit?: number;
}

export interface ParsedSearchFilters {
  search?: string;
  categorySlug?: string;
  categoryId?: string;
  brandSlugs?: string[];
  brandIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  variantAttributes?: AttributeFilter[];
  specifications?: AttributeFilter[];
  sort: ProductSortOption;
  page: number;
  limit: number;
}

export interface PublicCategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface PublicBrandSummary {
  id: string;
  name: string;
  slug: string;
}

export interface PublicProductCardDTO {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  category: PublicCategorySummary;
  brand: PublicBrandSummary | null;
  featured: boolean;
  tags: string[];
  images: ProductImageDTO[];
  priceRange: PriceRangeDTO;
  availableVariantCount: number;
}

export interface PaginationResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PublicProductSearchResponse {
  products: PublicProductCardDTO[];
  pagination: PaginationResponseMeta;
}

export interface CategoryFacetItem {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface BrandFacetItem {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface AttributeFacetValue {
  value: string;
  count: number;
}

export interface VariantAttributeFacet {
  name: string;
  values: AttributeFacetValue[];
}

export interface ProductFacetResponseDTO {
  categories: CategoryFacetItem[];
  brands: BrandFacetItem[];
  variantAttributes: VariantAttributeFacet[];
  price: {
    min: number;
    max: number;
    currency: string;
  };
}
