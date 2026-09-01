import { UnavailableReason } from './wishlist.constants.js';

export interface WishlistVariantOptionDTO {
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

export interface WishlistItemCategoryDTO {
  id: string;
  name: string;
  slug: string;
}

export interface WishlistItemBrandDTO {
  id: string;
  name: string;
  slug: string;
}

export interface WishlistPriceRangeDTO {
  min: number;
  max: number;
  currency: string;
}

export interface WishlistItemDTO {
  productId: string;
  name: string | null;
  slug: string | null;
  shortDescription: string | null;
  primaryImage: string | null;
  category: WishlistItemCategoryDTO | null;
  brand: WishlistItemBrandDTO | null;
  featured: boolean;
  priceRange: WishlistPriceRangeDTO | null;
  availableVariantCount: number;
  isAvailable: boolean;
  unavailableReason: UnavailableReason | null;
  addedAt: string;
  variants: WishlistVariantOptionDTO[];
}

export interface WishlistDTO {
  items: WishlistItemDTO[];
  itemCount: number;
}

export interface AddWishlistItemDTO {
  productId: string;
}
