import { Schema, model, Document, Types } from 'mongoose';
import { DISCOUNT_TYPE } from './promotion.constants.js';
import { ICoupon } from './promotion.types.js';

export interface CouponDocument extends Omit<ICoupon, '_id'>, Document {
  _id: Types.ObjectId;
}

const couponSchema = new Schema<CouponDocument>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    discountType: {
      type: String,
      enum: Object.values(DISCOUNT_TYPE),
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: 1,
    },
    minimumOrderAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    perUserLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    eligibleProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    eligibleCategoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    eligibleBrandIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Brand',
      },
    ],
    excludedProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    redemptionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ active: 1, startsAt: 1, endsAt: 1 });
couponSchema.index({ createdAt: -1 });

export const Coupon = model<CouponDocument>('Coupon', couponSchema);
