export type CheckoutStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'INVALIDATED'
  | 'COMPLETED';

export interface CheckoutAddressSnapshot {
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

export interface CheckoutItemSnapshot {
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
  couponDiscountAmount?: number;
  promotionDiscountAmount?: number;
  discountAmount?: number;
  finalLineTotal?: number;
}

export interface CheckoutDiscountSnapshot {
  couponId?: string;
  promotionId?: string;
  code?: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  discountAmount: number;
}

export interface CheckoutSession {
  id: string;
  userId: string;
  status: CheckoutStatus;
  items: CheckoutItemSnapshot[];
  shippingAddress: CheckoutAddressSnapshot;
  billingAddress: CheckoutAddressSnapshot;
  shippingMethod?: {
    shippingMethodId?: string;
    code: string;
    name: string;
    fee: number;
    currency: string;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  };
  shippingFee: number;
  subtotal: number;
  couponDiscountAmount?: number;
  promotionDiscountAmount?: number;
  discountAmount?: number;
  coupon?: CheckoutDiscountSnapshot | null;
  promotion?: CheckoutDiscountSnapshot | null;
  total: number;
  currency: string;
  expiresAt: string;
  remainingSeconds: number;
  lastValidatedAt: string;
  hasPriceChanges?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutInput {
  shippingAddressId: string;
  shippingMethodId?: string;
  billingSameAsShipping: boolean;
  billingAddressId?: string;
}
