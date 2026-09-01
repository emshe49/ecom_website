export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface ProductImage {
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface VariantDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name?: string | null;
  attributes: ProductAttribute[];
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  weightGrams?: number | null;
  dimensions?: VariantDimensions | null;
  isActive: boolean;
  inStock?: boolean;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface PriceRange {
  min: number;
  max: number;
  currency: string;
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

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId: string;
  category?: CategorySummary | null;
  brandId?: string | null;
  brand?: BrandSummary | null;
  status: ProductStatus;
  featured: boolean;
  tags: string[];
  images: ProductImage[];
  attributes: ProductAttribute[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  variantsCount?: number;
  priceRange?: PriceRange | null;
  ratingAverage?: number;
  ratingCount?: number;
  ratingDistribution?: Record<number, number>;
  createdBy?: string | null;
  updatedBy?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends Product {
  variants: ProductVariant[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedProducts {
  products: Product[];
  pagination: PaginationMeta;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId: string;
  brandId?: string | null;
  status?: ProductStatus;
  featured?: boolean;
  tags?: string[];
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId?: string;
  brandId?: string | null;
  featured?: boolean;
  tags?: string[];
  images?: ProductImage[];
  attributes?: ProductAttribute[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface CreateVariantInput {
  sku: string;
  name?: string | null;
  attributes?: ProductAttribute[];
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  weightGrams?: number | null;
  dimensions?: VariantDimensions | null;
  isActive?: boolean;
}

export interface UpdateVariantInput {
  sku?: string;
  name?: string | null;
  attributes?: ProductAttribute[];
  price?: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  weightGrams?: number | null;
  dimensions?: VariantDimensions | null;
  isActive?: boolean;
}
