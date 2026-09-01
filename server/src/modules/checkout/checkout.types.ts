import { CheckoutStatus } from './checkout.constants.js';

export interface CheckoutAddressSnapshotDTO {
  sourceAddressId: string;
  fullName: string;
  phone: string;
  country: string;
  stateProvince: string;
  city: string;
  area?: string | null;
  postalCode?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
}

export interface CheckoutItemSnapshotDTO {
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  sku: string;
  variantAttributes: Array<{ name: string; value: string }>;
  primaryImage?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CheckoutSessionDTO {
  id: string;
  userId: string;
  status: CheckoutStatus;
  items: CheckoutItemSnapshotDTO[];
  shippingAddress: CheckoutAddressSnapshotDTO;
  billingAddress: CheckoutAddressSnapshotDTO;
  subtotal: number;
  currency: string;
  expiresAt: string;
  remainingSeconds: number;
  lastValidatedAt: string;
  hasPriceChanges?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutInputDTO {
  shippingAddressId: string;
  billingSameAsShipping: boolean;
  billingAddressId?: string;
}
