import { Types } from 'mongoose';
import { DiscountType, RedemptionStatus } from './promotion.constants.js';

export interface ICoupon {
  _id: Types.ObjectId;
  code: string;
  normalizedCode: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  active: boolean;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  firstOrderOnly: boolean;
  eligibleProductIds: Types.ObjectId[];
  eligibleCategoryIds: Types.ObjectId[];
  eligibleBrandIds: Types.ObjectId[];
  excludedProductIds: Types.ObjectId[];
  redemptionCount: number;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPromotion {
  _id: Types.ObjectId;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  active: boolean;
  priority: number;
  stackable: boolean;
  eligibleProductIds: Types.ObjectId[];
  eligibleCategoryIds: Types.ObjectId[];
  eligibleBrandIds: Types.ObjectId[];
  excludedProductIds: Types.ObjectId[];
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICouponRedemption {
  _id: Types.ObjectId;
  couponId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  checkoutSessionId?: Types.ObjectId | null;
  codeSnapshot: string;
  discountAmount: number;
  status: RedemptionStatus;
  redeemedAt: Date;
  reversedAt?: Date | null;
  reversalReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscountContextItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  categoryId?: Types.ObjectId | null;
  brandId?: Types.ObjectId | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface DiscountContext {
  userId: Types.ObjectId;
  items: DiscountContextItem[];
  subtotal: number;
  shippingFee: number;
  currentTime: Date;
  isFirstOrder?: boolean;
}

export interface ItemDiscountAllocation {
  variantId: string;
  productId: string;
  lineTotal: number;
  couponDiscountAmount: number;
  promotionDiscountAmount: number;
  discountAmount: number;
  finalLineTotal: number;
}

export interface DiscountEvaluationResult {
  coupon?: {
    couponId: Types.ObjectId;
    code: string;
    name: string;
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
  } | null;
  promotion?: {
    promotionId: Types.ObjectId;
    name: string;
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
  } | null;
  couponDiscountAmount: number;
  promotionDiscountAmount: number;
  discountAmount: number;
  itemAllocations: ItemDiscountAllocation[];
}

export interface CouponDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  firstOrderOnly: boolean;
  eligibleProductIds: string[];
  eligibleCategoryIds: string[];
  eligibleBrandIds: string[];
  excludedProductIds: string[];
  redemptionCount: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionDTO {
  id: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  priority: number;
  stackable: boolean;
  eligibleProductIds: string[];
  eligibleCategoryIds: string[];
  eligibleBrandIds: string[];
  excludedProductIds: string[];
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouponRedemptionDTO {
  id: string;
  couponId: string;
  userId: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  codeSnapshot: string;
  discountAmount: number;
  status: RedemptionStatus;
  redeemedAt: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
  createdAt: string;
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
