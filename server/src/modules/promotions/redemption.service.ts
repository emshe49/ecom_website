import { Types, ClientSession } from 'mongoose';
import { Coupon } from './coupon.model.js';
import { CouponRedemption, CouponRedemptionDocument } from './coupon-redemption.model.js';
import { REDEMPTION_STATUS } from './promotion.constants.js';
import { promotionMapper } from './promotion.mapper.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/utils/logger.js';
import { CouponRedemptionDTO } from './promotion.types.js';

export const redemptionService = {
  /**
   * Atomically records coupon redemption during order creation.
   * Concurrency-safely increments coupon redemption count if within global limit.
   */
  async recordRedemption(
    couponId: Types.ObjectId,
    userId: Types.ObjectId,
    orderId: Types.ObjectId,
    codeSnapshot: string,
    discountAmount: number,
    checkoutSessionId?: Types.ObjectId | null,
    session?: ClientSession
  ): Promise<CouponRedemptionDocument> {
    // 1. Concurrency-safe atomic conditional increment of coupon redemption count
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw AppError.notFound('Coupon not found for redemption.', ErrorCodes.ERR_COUPON_NOT_FOUND);
    }

    let updatedCoupon = null;

    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
      updatedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: couponId,
          redemptionCount: { $lt: coupon.usageLimit },
        },
        {
          $inc: { redemptionCount: 1 },
        },
        { new: true, session }
      );

      if (!updatedCoupon) {
        throw AppError.badRequest(
          'Coupon usage limit was reached during order placement.',
          ErrorCodes.ERR_COUPON_USAGE_LIMIT_REACHED
        );
      }
    } else {
      updatedCoupon = await Coupon.findByIdAndUpdate(
        couponId,
        { $inc: { redemptionCount: 1 } },
        { new: true, session }
      );
    }

    // 2. Check for duplicate redemption for this order (idempotency safety)
    const existingRedemption = await CouponRedemption.findOne({ orderId }).session(session || null);
    if (existingRedemption) {
      return existingRedemption;
    }

    // 3. Create CouponRedemption record
    const redemption = new CouponRedemption({
      couponId,
      userId,
      orderId,
      checkoutSessionId: checkoutSessionId || null,
      codeSnapshot,
      discountAmount,
      status: REDEMPTION_STATUS.REDEEMED,
      redeemedAt: new Date(),
    });

    await redemption.save({ session });
    logger.info(`Coupon ${codeSnapshot} redeemed for order ${orderId.toString()} (Discount: ${discountAmount})`);

    return redemption;
  },

  /**
   * Reverses coupon redemption upon unpaid order cancellation.
   * Safely transitions redemption status to REVERSED and decrements coupon count.
   */
  async reverseRedemptionOnOrderCancellation(
    orderId: Types.ObjectId,
    reversalReason: string = 'Order cancelled'
  ): Promise<void> {
    const redemption = await CouponRedemption.findOne({
      orderId,
      status: REDEMPTION_STATUS.REDEEMED,
    });

    if (!redemption) {
      return; // No active coupon redemption for this order
    }

    // 1. Transition redemption status to REVERSED
    redemption.status = REDEMPTION_STATUS.REVERSED;
    redemption.reversedAt = new Date();
    redemption.reversalReason = reversalReason;
    await redemption.save();

    // 2. Decrement cached redemptionCount on Coupon safely
    await Coupon.updateOne(
      { _id: redemption.couponId, redemptionCount: { $gt: 0 } },
      { $inc: { redemptionCount: -1 } }
    );

    logger.info(
      `Coupon redemption reversed for order ${orderId.toString()}: ${redemption.codeSnapshot} (Reason: ${reversalReason})`
    );
  },

  /**
   * Admin: Get redemption history for a specific coupon
   */
  async getCouponRedemptions(
    couponId: string,
    query: { page?: number; limit?: number }
  ): Promise<{
    redemptions: CouponRedemptionDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    if (!Types.ObjectId.isValid(couponId)) {
      throw AppError.notFound('Coupon not found', ErrorCodes.ERR_COUPON_NOT_FOUND);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { couponId: new Types.ObjectId(couponId) };

    const [redemptions, total] = await Promise.all([
      CouponRedemption.find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('orderId', 'orderNumber')
        .sort({ redeemedAt: -1 })
        .skip(skip)
        .limit(limit),
      CouponRedemption.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const redemptionDTOs = redemptions.map((r) => {
      const user = r.userId as unknown as { firstName?: string; lastName?: string; email?: string } | null;
      const order = r.orderId as unknown as { orderNumber?: string } | null;
      const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Customer';
      return promotionMapper.toRedemptionDTO(
        r,
        order?.orderNumber,
        customerName,
        user?.email
      );
    });

    return {
      redemptions: redemptionDTOs,
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
};
