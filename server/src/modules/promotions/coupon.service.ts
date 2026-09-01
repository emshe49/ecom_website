import { Types, FilterQuery } from 'mongoose';
import { Coupon, CouponDocument } from './coupon.model.js';
import { CouponRedemption } from './coupon-redemption.model.js';
import { REDEMPTION_STATUS } from './promotion.constants.js';
import { discountEligibilityService } from './discount-eligibility.service.js';
import { discountCalculationService } from './discount-calculation.service.js';
import { promotionMapper } from './promotion.mapper.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import {
  CreateCouponInput,
  UpdateCouponInput,
  CouponDTO,
  DiscountContext,
} from './promotion.types.js';

export const couponService = {
  /**
   * Normalizes coupon code to uppercase trimmed string.
   */
  normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  },

  /**
   * Validates and calculates discount for a coupon code in a given context.
   */
  async validateAndEvaluateCoupon(
    rawCode: string,
    context: DiscountContext
  ): Promise<{
    coupon: CouponDocument;
    discountAmount: number;
    eligibleItemVariantIds: Set<string>;
  }> {
    const normalizedCode = this.normalizeCode(rawCode);

    const coupon = await Coupon.findOne({ normalizedCode });
    if (!coupon) {
      throw AppError.notFound(
        'Coupon code not found.',
        ErrorCodes.ERR_COUPON_NOT_FOUND
      );
    }

    // 1. Temporal & Active Validity Check
    const validity = discountEligibilityService.checkTemporalValidity(
      coupon,
      context.currentTime || new Date()
    );

    if (!validity.valid) {
      if (validity.reason === 'INACTIVE') {
        throw AppError.badRequest(
          'This coupon is currently inactive.',
          ErrorCodes.ERR_COUPON_INACTIVE
        );
      }
      if (validity.reason === 'NOT_STARTED') {
        throw AppError.badRequest(
          'This coupon promotion has not started yet.',
          ErrorCodes.ERR_COUPON_NOT_STARTED
        );
      }
      if (validity.reason === 'EXPIRED') {
        throw AppError.badRequest(
          'This coupon has expired.',
          ErrorCodes.ERR_COUPON_EXPIRED
        );
      }
    }

    // 2. Global Usage Limit Check
    if (
      coupon.usageLimit !== null &&
      coupon.usageLimit !== undefined &&
      coupon.redemptionCount >= coupon.usageLimit
    ) {
      throw AppError.badRequest(
        'This coupon has reached its maximum global usage limit.',
        ErrorCodes.ERR_COUPON_USAGE_LIMIT_REACHED
      );
    }

    // 3. Per-User Usage Limit Check
    if (
      coupon.perUserLimit !== null &&
      coupon.perUserLimit !== undefined &&
      coupon.perUserLimit > 0
    ) {
      const userRedemptionsCount = await CouponRedemption.countDocuments({
        couponId: coupon._id,
        userId: context.userId,
        status: REDEMPTION_STATUS.REDEEMED,
      });

      if (userRedemptionsCount >= coupon.perUserLimit) {
        throw AppError.badRequest(
          `You have already reached the maximum redemption limit (${coupon.perUserLimit}) for this coupon.`,
          ErrorCodes.ERR_COUPON_USER_LIMIT_REACHED
        );
      }
    }

    // 4. First Order Only Check
    if (coupon.firstOrderOnly) {
      const isFirstOrder = await discountEligibilityService.checkFirstOrderEligibility(
        context.userId
      );
      if (!isFirstOrder) {
        throw AppError.badRequest(
          'This coupon is only valid for your first order.',
          ErrorCodes.ERR_COUPON_FIRST_ORDER_ONLY
        );
      }
    }

    // 5. Item Eligibility Filter
    const eligibleItems = await discountEligibilityService.filterEligibleItems(
      context.items,
      {
        eligibleProductIds: coupon.eligibleProductIds,
        eligibleCategoryIds: coupon.eligibleCategoryIds,
        eligibleBrandIds: coupon.eligibleBrandIds,
        excludedProductIds: coupon.excludedProductIds,
      }
    );

    if (eligibleItems.length === 0) {
      throw AppError.badRequest(
        'This coupon is not applicable to any items in your checkout.',
        ErrorCodes.ERR_COUPON_NOT_APPLICABLE
      );
    }

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );

    // 6. Minimum Order Amount Check against eligible merchandise subtotal
    if (
      coupon.minimumOrderAmount &&
      eligibleSubtotal < coupon.minimumOrderAmount
    ) {
      throw AppError.badRequest(
        `This coupon requires a minimum eligible order amount of ${coupon.minimumOrderAmount / 100}.`,
        ErrorCodes.ERR_COUPON_MINIMUM_NOT_MET
      );
    }

    // 7. Calculate Discount
    const discountAmount = discountCalculationService.calculateRuleDiscount(
      eligibleSubtotal,
      coupon
    );

    if (discountAmount <= 0) {
      throw AppError.badRequest(
        'This coupon is not applicable to your order.',
        ErrorCodes.ERR_COUPON_NOT_APPLICABLE
      );
    }

    const eligibleItemVariantIds = new Set(
      eligibleItems.map((i) => i.variantId.toString())
    );

    return {
      coupon,
      discountAmount,
      eligibleItemVariantIds,
    };
  },

  /**
   * Admin: Create coupon
   */
  async createCoupon(
    input: CreateCouponInput,
    adminUserId: string
  ): Promise<CouponDTO> {
    const normalizedCode = this.normalizeCode(input.code);

    const existing = await Coupon.findOne({ normalizedCode });
    if (existing) {
      throw AppError.conflict(
        `Coupon with code '${normalizedCode}' already exists.`,
        ErrorCodes.ERR_COUPON_ALREADY_EXISTS
      );
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      normalizedCode,
      name: input.name,
      description: input.description || null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxDiscountAmount: input.maxDiscountAmount || null,
      minimumOrderAmount: input.minimumOrderAmount || null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      active: input.active !== undefined ? input.active : true,
      usageLimit: input.usageLimit || null,
      perUserLimit: input.perUserLimit || null,
      firstOrderOnly: input.firstOrderOnly || false,
      eligibleProductIds: (input.eligibleProductIds || []).map((id) => new Types.ObjectId(id)),
      eligibleCategoryIds: (input.eligibleCategoryIds || []).map((id) => new Types.ObjectId(id)),
      eligibleBrandIds: (input.eligibleBrandIds || []).map((id) => new Types.ObjectId(id)),
      excludedProductIds: (input.excludedProductIds || []).map((id) => new Types.ObjectId(id)),
      redemptionCount: 0,
      createdBy: new Types.ObjectId(adminUserId),
    });

    return promotionMapper.toCouponDTO(coupon);
  },

  /**
   * Admin: List coupons
   */
  async getCoupons(query: {
    search?: string;
    active?: boolean;
    discountType?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    coupons: CouponDTO[];
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

    const filter: FilterQuery<CouponDocument> = {};

    if (query.active !== undefined) {
      filter.active = query.active;
    }

    if (query.discountType) {
      filter.discountType = query.discountType;
    }

    if (query.search) {
      const searchRegex = { $regex: query.search.trim(), $options: 'i' };
      filter.$or = [{ code: searchRegex }, { name: searchRegex }];
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Coupon.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      coupons: coupons.map(promotionMapper.toCouponDTO),
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
   * Admin: Get coupon details
   */
  async getCouponById(couponId: string): Promise<CouponDTO> {
    if (!Types.ObjectId.isValid(couponId)) {
      throw AppError.notFound('Coupon not found', ErrorCodes.ERR_COUPON_NOT_FOUND);
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw AppError.notFound('Coupon not found', ErrorCodes.ERR_COUPON_NOT_FOUND);
    }

    return promotionMapper.toCouponDTO(coupon);
  },

  /**
   * Admin: Update coupon
   */
  async updateCoupon(
    couponId: string,
    input: UpdateCouponInput
  ): Promise<CouponDTO> {
    if (!Types.ObjectId.isValid(couponId)) {
      throw AppError.notFound('Coupon not found', ErrorCodes.ERR_COUPON_NOT_FOUND);
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw AppError.notFound('Coupon not found', ErrorCodes.ERR_COUPON_NOT_FOUND);
    }

    if (input.name !== undefined) coupon.name = input.name;
    if (input.description !== undefined) coupon.description = input.description;
    if (input.discountType !== undefined) coupon.discountType = input.discountType;
    if (input.discountValue !== undefined) coupon.discountValue = input.discountValue;
    if (input.maxDiscountAmount !== undefined) coupon.maxDiscountAmount = input.maxDiscountAmount;
    if (input.minimumOrderAmount !== undefined) coupon.minimumOrderAmount = input.minimumOrderAmount;
    if (input.startsAt !== undefined) coupon.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.endsAt !== undefined) coupon.endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (input.active !== undefined) coupon.active = input.active;
    if (input.usageLimit !== undefined) coupon.usageLimit = input.usageLimit;
    if (input.perUserLimit !== undefined) coupon.perUserLimit = input.perUserLimit;
    if (input.firstOrderOnly !== undefined) coupon.firstOrderOnly = input.firstOrderOnly;
    if (input.eligibleProductIds !== undefined) {
      coupon.eligibleProductIds = input.eligibleProductIds.map((id) => new Types.ObjectId(id));
    }
    if (input.eligibleCategoryIds !== undefined) {
      coupon.eligibleCategoryIds = input.eligibleCategoryIds.map((id) => new Types.ObjectId(id));
    }
    if (input.eligibleBrandIds !== undefined) {
      coupon.eligibleBrandIds = input.eligibleBrandIds.map((id) => new Types.ObjectId(id));
    }
    if (input.excludedProductIds !== undefined) {
      coupon.excludedProductIds = input.excludedProductIds.map((id) => new Types.ObjectId(id));
    }

    await coupon.save();
    return promotionMapper.toCouponDTO(coupon);
  },

  /**
   * Admin: Deactivate coupon (soft delete to preserve history)
   */
  async deleteCoupon(couponId: string): Promise<void> {
    if (!Types.ObjectId.isValid(couponId)) {
      throw AppError.notFound('Coupon not found', ErrorCodes.ERR_COUPON_NOT_FOUND);
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw AppError.notFound('Coupon not found', ErrorCodes.ERR_COUPON_NOT_FOUND);
    }

    coupon.active = false;
    await coupon.save();
  },
};
