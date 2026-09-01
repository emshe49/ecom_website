import { DISCOUNT_TYPE, DiscountType } from './promotion.constants.js';
import { DiscountContextItem, ItemDiscountAllocation } from './promotion.types.js';

export const discountCalculationService = {
  /**
   * Calculates discount amount for a rule based on eligible subtotal.
   * Percentage: eligibleSubtotal * (percentage / 100), bounded by maxDiscountAmount and eligibleSubtotal.
   * Fixed amount: min(fixedAmount, eligibleSubtotal).
   */
  calculateRuleDiscount(
    eligibleSubtotal: number,
    rule: {
      discountType: DiscountType;
      discountValue: number;
      maxDiscountAmount?: number | null;
    }
  ): number {
    if (eligibleSubtotal <= 0) return 0;

    let discount = 0;

    if (rule.discountType === DISCOUNT_TYPE.PERCENTAGE) {
      // Round to nearest integer (minor units/paisa/cents)
      discount = Math.round((eligibleSubtotal * rule.discountValue) / 100);

      if (rule.maxDiscountAmount && rule.maxDiscountAmount > 0) {
        discount = Math.min(discount, rule.maxDiscountAmount);
      }
    } else if (rule.discountType === DISCOUNT_TYPE.FIXED_AMOUNT) {
      discount = rule.discountValue;
    }

    // Never exceed the eligible merchandise subtotal
    return Math.min(discount, eligibleSubtotal);
  },

  /**
   * Allocates discount proportionally across eligible line items.
   * Ensures exact mathematical sum with no rounding mismatch.
   */
  allocateProportionalDiscount(
    items: DiscountContextItem[],
    eligibleItemVariantIds: Set<string>,
    totalDiscountToAllocate: number
  ): Map<string, number> {
    const allocations = new Map<string, number>();

    if (totalDiscountToAllocate <= 0) {
      for (const item of items) {
        allocations.set(item.variantId.toString(), 0);
      }
      return allocations;
    }

    const eligibleItems = items.filter((item) =>
      eligibleItemVariantIds.has(item.variantId.toString())
    );
    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.lineTotal, 0);

    if (eligibleSubtotal <= 0) {
      for (const item of items) {
        allocations.set(item.variantId.toString(), 0);
      }
      return allocations;
    }

    let allocatedSoFar = 0;

    eligibleItems.forEach((item, index) => {
      const variantKey = item.variantId.toString();

      if (index === eligibleItems.length - 1) {
        // Last item absorbs any rounding remainder
        const remainder = totalDiscountToAllocate - allocatedSoFar;
        const lineDiscount = Math.min(remainder, item.lineTotal);
        allocations.set(variantKey, lineDiscount);
        allocatedSoFar += lineDiscount;
      } else {
        const share = Math.round(
          (item.lineTotal / eligibleSubtotal) * totalDiscountToAllocate
        );
        const lineDiscount = Math.min(share, item.lineTotal);
        allocations.set(variantKey, lineDiscount);
        allocatedSoFar += lineDiscount;
      }
    });

    // For any ineligible items, set discount to 0
    for (const item of items) {
      const key = item.variantId.toString();
      if (!allocations.has(key)) {
        allocations.set(key, 0);
      }
    }

    return allocations;
  },

  /**
   * Builds full item discount allocation breakdown for both coupon and promotion.
   */
  buildItemAllocations(
    items: DiscountContextItem[],
    couponAllocations: Map<string, number>,
    promotionAllocations: Map<string, number>
  ): ItemDiscountAllocation[] {
    return items.map((item) => {
      const key = item.variantId.toString();
      const couponDiscount = couponAllocations.get(key) || 0;
      const promotionDiscount = promotionAllocations.get(key) || 0;
      const totalItemDiscount = Math.min(
        couponDiscount + promotionDiscount,
        item.lineTotal
      );
      const finalLineTotal = item.lineTotal - totalItemDiscount;

      return {
        variantId: key,
        productId: item.productId.toString(),
        lineTotal: item.lineTotal,
        couponDiscountAmount: couponDiscount,
        promotionDiscountAmount: promotionDiscount,
        discountAmount: totalItemDiscount,
        finalLineTotal,
      };
    });
  },
};
