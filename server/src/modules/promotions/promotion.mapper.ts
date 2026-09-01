import { CouponDocument } from './coupon.model.js';
import { PromotionDocument } from './promotion.model.js';
import { CouponRedemptionDocument } from './coupon-redemption.model.js';
import { CouponDTO, PromotionDTO, CouponRedemptionDTO } from './promotion.types.js';

export const promotionMapper = {
  toCouponDTO(coupon: CouponDocument): CouponDTO {
    return {
      id: coupon._id.toString(),
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || null,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount || null,
      minimumOrderAmount: coupon.minimumOrderAmount || null,
      startsAt: coupon.startsAt ? coupon.startsAt.toISOString() : null,
      endsAt: coupon.endsAt ? coupon.endsAt.toISOString() : null,
      active: coupon.active,
      usageLimit: coupon.usageLimit || null,
      perUserLimit: coupon.perUserLimit || null,
      firstOrderOnly: coupon.firstOrderOnly,
      eligibleProductIds: (coupon.eligibleProductIds || []).map((id) => id.toString()),
      eligibleCategoryIds: (coupon.eligibleCategoryIds || []).map((id) => id.toString()),
      eligibleBrandIds: (coupon.eligibleBrandIds || []).map((id) => id.toString()),
      excludedProductIds: (coupon.excludedProductIds || []).map((id) => id.toString()),
      redemptionCount: coupon.redemptionCount || 0,
      createdBy: coupon.createdBy ? coupon.createdBy.toString() : null,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  },

  toPromotionDTO(promotion: PromotionDocument): PromotionDTO {
    return {
      id: promotion._id.toString(),
      name: promotion.name,
      description: promotion.description || null,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      maxDiscountAmount: promotion.maxDiscountAmount || null,
      minimumOrderAmount: promotion.minimumOrderAmount || null,
      startsAt: promotion.startsAt ? promotion.startsAt.toISOString() : null,
      endsAt: promotion.endsAt ? promotion.endsAt.toISOString() : null,
      active: promotion.active,
      priority: promotion.priority || 0,
      stackable: promotion.stackable || false,
      eligibleProductIds: (promotion.eligibleProductIds || []).map((id) => id.toString()),
      eligibleCategoryIds: (promotion.eligibleCategoryIds || []).map((id) => id.toString()),
      eligibleBrandIds: (promotion.eligibleBrandIds || []).map((id) => id.toString()),
      excludedProductIds: (promotion.excludedProductIds || []).map((id) => id.toString()),
      createdBy: promotion.createdBy ? promotion.createdBy.toString() : null,
      createdAt: promotion.createdAt.toISOString(),
      updatedAt: promotion.updatedAt.toISOString(),
    };
  },

  toRedemptionDTO(
    redemption: CouponRedemptionDocument,
    orderNumber?: string,
    customerName?: string,
    customerEmail?: string
  ): CouponRedemptionDTO {
    return {
      id: redemption._id.toString(),
      couponId: redemption.couponId.toString(),
      userId: redemption.userId.toString(),
      orderId: redemption.orderId.toString(),
      orderNumber,
      customerName,
      customerEmail,
      codeSnapshot: redemption.codeSnapshot,
      discountAmount: redemption.discountAmount,
      status: redemption.status,
      redeemedAt: redemption.redeemedAt.toISOString(),
      reversedAt: redemption.reversedAt ? redemption.reversedAt.toISOString() : null,
      reversalReason: redemption.reversalReason || null,
      createdAt: redemption.createdAt.toISOString(),
    };
  },
};
