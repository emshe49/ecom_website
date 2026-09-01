export type ProductSortOption =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'price-asc'
  | 'price-desc'
  | 'featured';

export interface ProductImage {
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface ProductCardDTO {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  category: CategorySummary;
  brand: BrandSummary | null;
  featured: boolean;
  tags: string[];
  images: ProductImage[];
  priceRange: PriceRange;
  availableVariantCount: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProductSearchResponse {
  products: ProductCardDTO[];
  pagination: PaginationMeta;
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

export interface ProductFacetResponse {
  categories: CategoryFacetItem[];
  brands: BrandFacetItem[];
  variantAttributes: VariantAttributeFacet[];
  price: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface StorefrontFilterState {
  search?: string;
  category?: string;
  brand?: string[]; // Array of brand slugs
  minPriceMajor?: number | ''; // in PKR (major units)
  maxPriceMajor?: number | '';
  attributes?: Record<string, string[]>; // { color: ["black", "white"], size: ["large"] }
  sort?: ProductSortOption;
  page?: number;
}
