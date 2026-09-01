import { UnavailableReason } from './cart.constants.js';

export interface CartVariantAttributeDTO {
  name: string;
  value: string;
}

export interface CartItemDTO {
  variantId: string;
  productId: string | null;
  productName: string | null;
  productSlug: string | null;
  primaryImage: string | null;
  sku: string | null;
  variantAttributes: CartVariantAttributeDTO[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string;
  isAvailable: boolean;
  unavailableReason?: UnavailableReason | null;
  addedAt: string;
}

export interface CartDTO {
  items: CartItemDTO[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  currency: string;
}

export interface AddToCartDTO {
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemDTO {
  quantity: number;
}
