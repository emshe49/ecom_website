import { Types, FilterQuery } from 'mongoose';
import { Promotion, PromotionDocument } from './promotion.model.js';
import { discountEligibilityService } from './discount-eligibility.service.js';
import { discountCalculationService } from './discount-calculation.service.js';
import { promotionMapper } from './promotion.mapper.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import {
  CreatePromotionInput,
  UpdatePromotionInput,
  PromotionDTO,
  DiscountContext,
} from './promotion.types.js';

export const promotionService = {
  /**
   * Evaluates all active automatic promotions against the given discount context.
   * Returns the best matching promotion and its calculated discount amount.
   */
  async evaluateAutomaticPromotions(
    context: DiscountContext
  ): Promise<{
    promotion: PromotionDocument | null;
    discountAmount: number;
    eligibleItemVariantIds: Set<string>;
  }> {
    const now = context.currentTime || new Date();

    // Query active promotions within validity window
    const activePromotions = await Promotion.find({
      active: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    }).sort({ priority: -1, createdAt: -1 });

    if (activePromotions.length === 0) {
      return { promotion: null, discountAmount: 0, eligibleItemVariantIds: new Set() };
    }

    let bestPromotion: PromotionDocument | null = null;
    let maxDiscount = 0;
    let bestEligibleVariantIds = new Set<string>();

    for (const promo of activePromotions) {
      // 1. Filter eligible items
      const eligibleItems = await discountEligibilityService.filterEligibleItems(
        context.items,
        {
          eligibleProductIds: promo.eligibleProductIds,
          eligibleCategoryIds: promo.eligibleCategoryIds,
          eligibleBrandIds: promo.eligibleBrandIds,
          excludedProductIds: promo.excludedProductIds,
        }
      );

      if (eligibleItems.length === 0) continue;

      const eligibleSubtotal = eligibleItems.reduce(
        (sum, item) => sum + item.lineTotal,
        0
      );

      // 2. Check minimum order requirement against eligible subtotal
      if (
        promo.minimumOrderAmount &&
        eligibleSubtotal < promo.minimumOrderAmount
      ) {
        continue;
      }

      // 3. Calculate discount
      const calculatedDiscount = discountCalculationService.calculateRuleDiscount(
        eligibleSubtotal,
        promo
      );

      if (calculatedDiscount <= 0) continue;

      // 4. Best discount / priority selection rule
      if (
        calculatedDiscount > maxDiscount ||
        (calculatedDiscount === maxDiscount &&
          bestPromotion &&
          promo.priority > bestPromotion.priority)
      ) {
        maxDiscount = calculatedDiscount;
        bestPromotion = promo;
        bestEligibleVariantIds = new Set(
          eligibleItems.map((i) => i.variantId.toString())
        );
      }
    }

    return {
      promotion: bestPromotion,
      discountAmount: maxDiscount,
      eligibleItemVariantIds: bestEligibleVariantIds,
    };
  },

  /**
   * Admin: Create a new promotion
   */
  async createPromotion(
    input: CreatePromotionInput,
    adminUserId: string
  ): Promise<PromotionDTO> {
    const promo = await Promotion.create({
      name: input.name,
      description: input.description || null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxDiscountAmount: input.maxDiscountAmount || null,
      minimumOrderAmount: input.minimumOrderAmount || null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      active: input.active !== undefined ? input.active : true,
      priority: input.priority || 0,
      stackable: input.stackable || false,
      eligibleProductIds: (input.eligibleProductIds || []).map((id) => new Types.ObjectId(id)),
      eligibleCategoryIds: (input.eligibleCategoryIds || []).map((id) => new Types.ObjectId(id)),
      eligibleBrandIds: (input.eligibleBrandIds || []).map((id) => new Types.ObjectId(id)),
      excludedProductIds: (input.excludedProductIds || []).map((id) => new Types.ObjectId(id)),
      createdBy: new Types.ObjectId(adminUserId),
    });

    return promotionMapper.toPromotionDTO(promo);
  },

  /**
   * Admin: List promotions
   */
  async getPromotions(query: {
    search?: string;
    active?: boolean;
    discountType?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    promotions: PromotionDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<PromotionDocument> = {};

    if (query.active !== undefined) {
      filter.active = query.active;
    }

    if (query.discountType) {
      filter.discountType = query.discountType;
    }

    if (query.search) {
      filter.name = { $regex: query.search.trim(), $options: 'i' };
    }

    const [promotions, total] = await Promise.all([
      Promotion.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit),
      Promotion.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      promotions: promotions.map(promotionMapper.toPromotionDTO),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  },

  /**
   * Admin: Get promotion details
   */
  async getPromotionById(promotionId: string): Promise<PromotionDTO> {
    if (!Types.ObjectId.isValid(promotionId)) {
      throw AppError.notFound('Promotion not found', ErrorCodes.ERR_PROMOTION_NOT_FOUND);
    }

    const promo = await Promotion.findById(promotionId);
    if (!promo) {
      throw AppError.notFound('Promotion not found', ErrorCodes.ERR_PROMOTION_NOT_FOUND);
    }

    return promotionMapper.toPromotionDTO(promo);
  },

  /**
   * Admin: Update promotion
   */
  async updatePromotion(
    promotionId: string,
    input: UpdatePromotionInput
  ): Promise<PromotionDTO> {
    if (!Types.ObjectId.isValid(promotionId)) {
      throw AppError.notFound('Promotion not found', ErrorCodes.ERR_PROMOTION_NOT_FOUND);
    }

    const promo = await Promotion.findById(promotionId);
    if (!promo) {
      throw AppError.notFound('Promotion not found', ErrorCodes.ERR_PROMOTION_NOT_FOUND);
    }

    if (input.name !== undefined) promo.name = input.name;
    if (input.description !== undefined) promo.description = input.description;
    if (input.discountType !== undefined) promo.discountType = input.discountType;
    if (input.discountValue !== undefined) promo.discountValue = input.discountValue;
    if (input.maxDiscountAmount !== undefined) promo.maxDiscountAmount = input.maxDiscountAmount;
    if (input.minimumOrderAmount !== undefined) promo.minimumOrderAmount = input.minimumOrderAmount;
    if (input.startsAt !== undefined) promo.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.endsAt !== undefined) promo.endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (input.active !== undefined) promo.active = input.active;
    if (input.priority !== undefined) promo.priority = input.priority;
    if (input.stackable !== undefined) promo.stackable = input.stackable;
    if (input.eligibleProductIds !== undefined) {
      promo.eligibleProductIds = input.eligibleProductIds.map((id) => new Types.ObjectId(id));
    }
    if (input.eligibleCategoryIds !== undefined) {
      promo.eligibleCategoryIds = input.eligibleCategoryIds.map((id) => new Types.ObjectId(id));
    }
    if (input.eligibleBrandIds !== undefined) {
      promo.eligibleBrandIds = input.eligibleBrandIds.map((id) => new Types.ObjectId(id));
    }
    if (input.excludedProductIds !== undefined) {
      promo.excludedProductIds = input.excludedProductIds.map((id) => new Types.ObjectId(id));
    }

    await promo.save();
    return promotionMapper.toPromotionDTO(promo);
  },

  /**
   * Admin: Delete/Deactivate promotion
   */
  async deletePromotion(promotionId: string): Promise<void> {
    if (!Types.ObjectId.isValid(promotionId)) {
      throw AppError.notFound('Promotion not found', ErrorCodes.ERR_PROMOTION_NOT_FOUND);
    }

    const promo = await Promotion.findById(promotionId);
    if (!promo) {
      throw AppError.notFound('Promotion not found', ErrorCodes.ERR_PROMOTION_NOT_FOUND);
    }

    // Soft deactivation to preserve historical record integrity
    promo.active = false;
    await promo.save();
  },
};
