export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type RedemptionStatus = 'REDEEMED' | 'REVERSED';

export interface CouponDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minimumOrderAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  usageLimit: number | null;
  perUserLimit: number | null;
  firstOrderOnly: boolean;
  eligibleProductIds: string[];
  eligibleCategoryIds: string[];
  eligibleBrandIds: string[];
  excludedProductIds: string[];
  redemptionCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionDTO {
  id: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minimumOrderAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  priority: number;
  stackable: boolean;
  eligibleProductIds: string[];
  eligibleCategoryIds: string[];
  eligibleBrandIds: string[];
  excludedProductIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CouponRedemptionDTO {
  id: string;
  couponId: string;
  userId: string;
  orderId: string;
  checkoutSessionId: string;
  codeSnapshot: string;
  discountAmount: number;
  status: RedemptionStatus;
  redeemedAt: string;
  reversedAt: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponInput {
  code: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  firstOrderOnly?: boolean;
  eligibleProductIds?: string[];
  eligibleCategoryIds?: string[];
  eligibleBrandIds?: string[];
  excludedProductIds?: string[];
}

export interface UpdateCouponInput {
  name?: string;
  description?: string | null;
  discountType?: DiscountType;
  discountValue?: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  firstOrderOnly?: boolean;
  eligibleProductIds?: string[];
  eligibleCategoryIds?: string[];
  eligibleBrandIds?: string[];
  excludedProductIds?: string[];
}

export interface CreatePromotionInput {
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
  priority?: number;
  stackable?: boolean;
  eligibleProductIds?: string[];
  eligibleCategoryIds?: string[];
  eligibleBrandIds?: string[];
  excludedProductIds?: string[];
}

export interface UpdatePromotionInput {
  name?: string;
  description?: string | null;
  discountType?: DiscountType;
  discountValue?: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
  priority?: number;
  stackable?: boolean;
  eligibleProductIds?: string[];
  eligibleCategoryIds?: string[];
  eligibleBrandIds?: string[];
  excludedProductIds?: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
