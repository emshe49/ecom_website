import { ProductStatus } from './product.constants.js';

export interface ProductImageDTO {
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductAttributeDTO {
  name: string;
  value: string;
}

export interface VariantDimensionsDTO {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ProductVariantDTO {
  id: string;
  productId: string;
  sku: string;
  name?: string | null;
  attributes: ProductAttributeDTO[];
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  weightGrams?: number | null;
  dimensions?: VariantDimensionsDTO | null;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicVariantDTO {
  id: string;
  productId: string;
  sku: string;
  name: string;
  attributes: ProductAttributeDTO[];
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  weightGrams?: number | null;
  dimensions?: VariantDimensionsDTO | null;
  isActive: boolean;
  inStock?: boolean;
  stockStatus?: string;
}


export interface PriceRangeDTO {
  min: number;
  max: number;
  currency: string;
}

export interface CategorySummaryDTO {
  id: string;
  name: string;
  slug: string;
}

export interface BrandSummaryDTO {
  id: string;
  name: string;
  slug: string;
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId: string;
  category?: CategorySummaryDTO | null;
  brandId?: string | null;
  brand?: BrandSummaryDTO | null;
  status: ProductStatus;
  featured: boolean;
  tags: string[];
  images: ProductImageDTO[];
  attributes: ProductAttributeDTO[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  variantsCount?: number;
  priceRange?: PriceRangeDTO | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetailDTO extends ProductDTO {
  variants: ProductVariantDTO[];
}

export interface PublicProductDTO {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  category: CategorySummaryDTO;
  brand?: BrandSummaryDTO | null;
  featured: boolean;
  tags: string[];
  images: ProductImageDTO[];
  attributes: ProductAttributeDTO[];
  priceRange: PriceRangeDTO;
}

export interface PublicProductDetailDTO extends PublicProductDTO {
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  variants: PublicVariantDTO[];
}

export interface CreateProductDTO {
  name: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId: string;
  brandId?: string | null;
  status?: ProductStatus;
  featured?: boolean;
  tags?: string[];
  images?: ProductImageDTO[];
  attributes?: ProductAttributeDTO[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface UpdateProductDTO {
  name?: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId?: string;
  brandId?: string | null;
  featured?: boolean;
  tags?: string[];
  images?: ProductImageDTO[];
  attributes?: ProductAttributeDTO[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface CreateVariantDTO {
  sku: string;
  name?: string | null;
  attributes?: ProductAttributeDTO[];
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  weightGrams?: number | null;
  dimensions?: VariantDimensionsDTO | null;
  isActive?: boolean;
}

export interface UpdateVariantDTO {
  sku?: string;
  name?: string | null;
  attributes?: ProductAttributeDTO[];
  price?: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  weightGrams?: number | null;
  dimensions?: VariantDimensionsDTO | null;
  isActive?: boolean;
}

export interface ProductQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  brandId?: string;
  featured?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PublicProductQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string; // category slug or id
  brand?: string; // brand slug or id
  featured?: boolean;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
