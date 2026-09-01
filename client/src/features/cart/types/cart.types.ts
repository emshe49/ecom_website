export interface CartVariantAttribute {
  name: string;
  value: string;
}

export interface CartItem {
  variantId: string;
  productId: string | null;
  productName: string | null;
  productSlug: string | null;
  primaryImage: string | null;
  sku: string | null;
  variantAttributes: CartVariantAttribute[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string;
  isAvailable: boolean;
  unavailableReason?: string | null;
  addedAt: string;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  currency: string;
}

export interface AddToCartPayload {
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}
