export type UnavailableReason =
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_DRAFT'
  | 'PRODUCT_INACTIVE'
  | 'PRODUCT_ARCHIVED'
  | 'CATEGORY_INACTIVE'
  | 'BRAND_INACTIVE'
  | 'NO_ACTIVE_VARIANTS';

export interface WishlistVariantOption {
  id: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  attributes: Array<{
    name: string;
    value: string;
  }>;
  isActive: boolean;
}

export interface WishlistItemCategory {
  id: string;
  name: string;
  slug: string;
}

export interface WishlistItemBrand {
  id: string;
  name: string;
  slug: string;
}

export interface WishlistPriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface WishlistItem {
  productId: string;
  name: string | null;
  slug: string | null;
  shortDescription: string | null;
  primaryImage: string | null;
  category: WishlistItemCategory | null;
  brand: WishlistItemBrand | null;
  featured: boolean;
  priceRange: WishlistPriceRange | null;
  availableVariantCount: number;
  isAvailable: boolean;
  unavailableReason: UnavailableReason | null;
  addedAt: string;
  variants: WishlistVariantOption[];
}

export interface Wishlist {
  items: WishlistItem[];
  itemCount: number;
}
