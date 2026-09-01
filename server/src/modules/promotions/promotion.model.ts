import { Schema, model, Document, Types } from 'mongoose';
import { DISCOUNT_TYPE } from './promotion.constants.js';
import { IPromotion } from './promotion.types.js';

export interface PromotionDocument extends Omit<IPromotion, '_id'>, Document {
  _id: Types.ObjectId;
}

const promotionSchema = new Schema<PromotionDocument>(
  {
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
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    stackable: {
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

promotionSchema.index({ active: 1, startsAt: 1, endsAt: 1 });
promotionSchema.index({ priority: -1, createdAt: -1 });

export const Promotion = model<PromotionDocument>('Promotion', promotionSchema);
