import { Types } from 'mongoose';
import { Category } from '../catalog/categories/category.model.js';
import { Order } from '../orders/order.model.js';
import { ORDER_STATUS } from '../orders/order.constants.js';
import { DiscountContextItem } from './promotion.types.js';

export const discountEligibilityService = {
  /**
   * Resolves category IDs and all their active descendant category IDs.
   */
  async resolveCategoryHierarchy(categoryIds: Types.ObjectId[]): Promise<Set<string>> {
    if (!categoryIds || categoryIds.length === 0) {
      return new Set();
    }

    const resolvedIds = new Set<string>(categoryIds.map((id) => id.toString()));
    let currentLevel = [...categoryIds];

    while (currentLevel.length > 0) {
      const children = await Category.find({
        parentId: { $in: currentLevel },
        isActive: true,
      })
        .select('_id')
        .lean();

      if (children.length === 0) break;

      const nextLevel: Types.ObjectId[] = [];
      for (const child of children) {
        const idStr = child._id.toString();
        if (!resolvedIds.has(idStr)) {
          resolvedIds.add(idStr);
          nextLevel.push(child._id);
        }
      }
      currentLevel = nextLevel;
    }

    return resolvedIds;
  },

  /**
   * Determines if an individual line item is eligible for a discount rule.
   * Product exclusions always win over product/category/brand inclusion.
   */
  isItemEligible(
    item: DiscountContextItem,
    rule: {
      eligibleProductIds?: Types.ObjectId[];
      eligibleCategoryIds?: Types.ObjectId[];
      eligibleBrandIds?: Types.ObjectId[];
      excludedProductIds?: Types.ObjectId[];
    },
    resolvedCategoryIds?: Set<string>
  ): boolean {
    const itemProductIdStr = item.productId.toString();

    // 1. Explicit Exclusions always win
    if (rule.excludedProductIds && rule.excludedProductIds.length > 0) {
      const isExcluded = rule.excludedProductIds.some(
        (id) => id.toString() === itemProductIdStr
      );
      if (isExcluded) {
        return false;
      }
    }

    const hasProductFilter = rule.eligibleProductIds && rule.eligibleProductIds.length > 0;
    const hasCategoryFilter = rule.eligibleCategoryIds && rule.eligibleCategoryIds.length > 0;
    const hasBrandFilter = rule.eligibleBrandIds && rule.eligibleBrandIds.length > 0;

    // If no inclusion criteria specified, all non-excluded items qualify
    if (!hasProductFilter && !hasCategoryFilter && !hasBrandFilter) {
      return true;
    }

    // 2. Product Inclusion Check
    if (hasProductFilter) {
      const matchesProduct = rule.eligibleProductIds!.some(
        (id) => id.toString() === itemProductIdStr
      );
      if (matchesProduct) return true;
    }

    // 3. Category Inclusion Check (including descendants)
    if (hasCategoryFilter && item.categoryId) {
      const itemCategoryIdStr = item.categoryId.toString();
      if (resolvedCategoryIds && resolvedCategoryIds.has(itemCategoryIdStr)) {
        return true;
      }
      const matchesDirectCategory = rule.eligibleCategoryIds!.some(
        (id) => id.toString() === itemCategoryIdStr
      );
      if (matchesDirectCategory) return true;
    }

    // 4. Brand Inclusion Check
    if (hasBrandFilter && item.brandId) {
      const itemBrandIdStr = item.brandId.toString();
      const matchesBrand = rule.eligibleBrandIds!.some(
        (id) => id.toString() === itemBrandIdStr
      );
      if (matchesBrand) return true;
    }

    return false;
  },

  /**
   * Filters and returns eligible line items for a rule.
   */
  async filterEligibleItems(
    items: DiscountContextItem[],
    rule: {
      eligibleProductIds?: Types.ObjectId[];
      eligibleCategoryIds?: Types.ObjectId[];
      eligibleBrandIds?: Types.ObjectId[];
      excludedProductIds?: Types.ObjectId[];
    }
  ): Promise<DiscountContextItem[]> {
    let resolvedCategories: Set<string> | undefined;
    if (rule.eligibleCategoryIds && rule.eligibleCategoryIds.length > 0) {
      resolvedCategories = await this.resolveCategoryHierarchy(rule.eligibleCategoryIds);
    }

    return items.filter((item) =>
      this.isItemEligible(item, rule, resolvedCategories)
    );
  },

  /**
   * Validates date window and active flag.
   */
  checkTemporalValidity(
    rule: { active: boolean; startsAt?: Date | null; endsAt?: Date | null },
    now: Date = new Date()
  ): { valid: boolean; reason?: 'INACTIVE' | 'NOT_STARTED' | 'EXPIRED' } {
    if (!rule.active) {
      return { valid: false, reason: 'INACTIVE' };
    }

    const nowTime = now.getTime();

    if (rule.startsAt && nowTime < new Date(rule.startsAt).getTime()) {
      return { valid: false, reason: 'NOT_STARTED' };
    }

    if (rule.endsAt && nowTime > new Date(rule.endsAt).getTime()) {
      return { valid: false, reason: 'EXPIRED' };
    }

    return { valid: true };
  },

  /**
   * Checks if user qualifies as a first-time customer (no historical non-cancelled orders).
   */
  async checkFirstOrderEligibility(userId: Types.ObjectId): Promise<boolean> {
    const historicalOrderCount = await Order.countDocuments({
      userId,
      status: { $ne: ORDER_STATUS.CANCELLED },
    });
    return historicalOrderCount === 0;
  },
};
