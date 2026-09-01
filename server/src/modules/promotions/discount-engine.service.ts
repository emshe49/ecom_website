import { Types } from 'mongoose';
import { promotionService } from './promotion.service.js';
import { couponService } from './coupon.service.js';
import { discountCalculationService } from './discount-calculation.service.js';
import {
  DiscountContext,
  DiscountEvaluationResult,
} from './promotion.types.js';

export const discountEngineService = {
  /**
   * Evaluates all automatic promotions and optional customer coupon code for a given discount context.
   * Enforces stacking rules:
   * 1. If promotion.stackable is true: coupon + promotion combine up to total merchandise subtotal.
   * 2. If promotion.stackable is false: system awards the single best discount (greater of promo or coupon).
   */
  async evaluateDiscounts(
    context: DiscountContext,
    couponCode?: string | null
  ): Promise<DiscountEvaluationResult> {
    // 1. Evaluate Automatic Promotions
    const promoResult = await promotionService.evaluateAutomaticPromotions(context);

    // 2. Evaluate Coupon (if code provided)
    let couponEvalResult: Awaited<
      ReturnType<typeof couponService.validateAndEvaluateCoupon>
    > | null = null;

    if (couponCode && couponCode.trim()) {
      couponEvalResult = await couponService.validateAndEvaluateCoupon(
        couponCode,
        context
      );
    }

    // 3. Stacking & Conflict Resolution
    let finalCoupon: DiscountEvaluationResult['coupon'] = null;
    let finalPromotion: DiscountEvaluationResult['promotion'] = null;
    let couponDiscountAmount = 0;
    let promotionDiscountAmount = 0;
    let couponEligibleVariantIds = new Set<string>();
    let promoEligibleVariantIds = new Set<string>();

    if (promoResult.promotion && couponEvalResult) {
      if (promoResult.promotion.stackable) {
        // Both stack!
        finalPromotion = {
          promotionId: promoResult.promotion._id,
          name: promoResult.promotion.name,
          discountType: promoResult.promotion.discountType,
          discountValue: promoResult.promotion.discountValue,
          discountAmount: promoResult.discountAmount,
        };
        promotionDiscountAmount = promoResult.discountAmount;
        promoEligibleVariantIds = promoResult.eligibleItemVariantIds;

        finalCoupon = {
          couponId: couponEvalResult.coupon._id,
          code: couponEvalResult.coupon.code,
          name: couponEvalResult.coupon.name,
          discountType: couponEvalResult.coupon.discountType,
          discountValue: couponEvalResult.coupon.discountValue,
          discountAmount: couponEvalResult.discountAmount,
        };
        couponDiscountAmount = couponEvalResult.discountAmount;
        couponEligibleVariantIds = couponEvalResult.eligibleItemVariantIds;
      } else {
        // Non-stackable conflict: Choose best discount
        if (couponEvalResult.discountAmount > promoResult.discountAmount) {
          finalCoupon = {
            couponId: couponEvalResult.coupon._id,
            code: couponEvalResult.coupon.code,
            name: couponEvalResult.coupon.name,
            discountType: couponEvalResult.coupon.discountType,
            discountValue: couponEvalResult.coupon.discountValue,
            discountAmount: couponEvalResult.discountAmount,
          };
          couponDiscountAmount = couponEvalResult.discountAmount;
          couponEligibleVariantIds = couponEvalResult.eligibleItemVariantIds;
        } else {
          finalPromotion = {
            promotionId: promoResult.promotion._id,
            name: promoResult.promotion.name,
            discountType: promoResult.promotion.discountType,
            discountValue: promoResult.promotion.discountValue,
            discountAmount: promoResult.discountAmount,
          };
          promotionDiscountAmount = promoResult.discountAmount;
          promoEligibleVariantIds = promoResult.eligibleItemVariantIds;
        }
      }
    } else if (promoResult.promotion) {
      finalPromotion = {
        promotionId: promoResult.promotion._id,
        name: promoResult.promotion.name,
        discountType: promoResult.promotion.discountType,
        discountValue: promoResult.promotion.discountValue,
        discountAmount: promoResult.discountAmount,
      };
      promotionDiscountAmount = promoResult.discountAmount;
      promoEligibleVariantIds = promoResult.eligibleItemVariantIds;
    } else if (couponEvalResult) {
      finalCoupon = {
        couponId: couponEvalResult.coupon._id,
        code: couponEvalResult.coupon.code,
        name: couponEvalResult.coupon.name,
        discountType: couponEvalResult.coupon.discountType,
        discountValue: couponEvalResult.coupon.discountValue,
        discountAmount: couponEvalResult.discountAmount,
      };
      couponDiscountAmount = couponEvalResult.discountAmount;
      couponEligibleVariantIds = couponEvalResult.eligibleItemVariantIds;
    }

    // 4. Bound total discount by merchandise subtotal
    const merchandiseSubtotal = context.subtotal;
    let totalDiscount = couponDiscountAmount + promotionDiscountAmount;

    if (totalDiscount > merchandiseSubtotal) {
      const scale = merchandiseSubtotal / totalDiscount;
      couponDiscountAmount = Math.round(couponDiscountAmount * scale);
      promotionDiscountAmount = merchandiseSubtotal - couponDiscountAmount;
      totalDiscount = merchandiseSubtotal;

      if (finalCoupon) finalCoupon.discountAmount = couponDiscountAmount;
      if (finalPromotion) finalPromotion.discountAmount = promotionDiscountAmount;
    }

    // 5. Line Item Proportional Allocations
    const couponAllocations = discountCalculationService.allocateProportionalDiscount(
      context.items,
      couponEligibleVariantIds,
      couponDiscountAmount
    );

    const promotionAllocations = discountCalculationService.allocateProportionalDiscount(
      context.items,
      promoEligibleVariantIds,
      promotionDiscountAmount
    );

    const itemAllocations = discountCalculationService.buildItemAllocations(
      context.items,
      couponAllocations,
      promotionAllocations
    );

    return {
      coupon: finalCoupon,
      promotion: finalPromotion,
      couponDiscountAmount,
      promotionDiscountAmount,
      discountAmount: totalDiscount,
      itemAllocations,
    };
  },
};
