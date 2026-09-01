import { Schema, model, Document, Types } from 'mongoose';
import { REDEMPTION_STATUS } from './promotion.constants.js';
import { ICouponRedemption } from './promotion.types.js';

export interface CouponRedemptionDocument extends Omit<ICouponRedemption, '_id'>, Document {
  _id: Types.ObjectId;
}

const couponRedemptionSchema = new Schema<CouponRedemptionDocument>(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    checkoutSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'CheckoutSession',
      default: null,
    },
    codeSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(REDEMPTION_STATUS),
      default: REDEMPTION_STATUS.REDEEMED,
      index: true,
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    reversalReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

couponRedemptionSchema.index({ couponId: 1, status: 1, redeemedAt: -1 });
couponRedemptionSchema.index({ couponId: 1, userId: 1, status: 1 });

export const CouponRedemption = model<CouponRedemptionDocument>(
  'CouponRedemption',
  couponRedemptionSchema
);
