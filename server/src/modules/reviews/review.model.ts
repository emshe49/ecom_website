import { Schema, model } from 'mongoose';
import { REVIEW_STATUS, REVIEW_STATUS_LIST, REVIEW_LIMITS } from './review.constants.js';
import { IReview } from './review.types.js';

const reviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductVariant',
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [REVIEW_LIMITS.RATING_MIN, `Rating must be at least ${REVIEW_LIMITS.RATING_MIN}`],
      max: [REVIEW_LIMITS.RATING_MAX, `Rating cannot exceed ${REVIEW_LIMITS.RATING_MAX}`],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer rating.',
      },
    },
    title: {
      type: String,
      default: null,
      trim: true,
      maxlength: [REVIEW_LIMITS.TITLE_MAX_LENGTH, `Title cannot exceed ${REVIEW_LIMITS.TITLE_MAX_LENGTH} characters`],
    },
    body: {
      type: String,
      required: [true, 'Review body is required'],
      trim: true,
      minlength: [REVIEW_LIMITS.BODY_MIN_LENGTH, `Review body must be at least ${REVIEW_LIMITS.BODY_MIN_LENGTH} characters`],
      maxlength: [REVIEW_LIMITS.BODY_MAX_LENGTH, `Review body cannot exceed ${REVIEW_LIMITS.BODY_MAX_LENGTH} characters`],
    },
    status: {
      type: String,
      enum: REVIEW_STATUS_LIST,
      default: REVIEW_STATUS.PUBLISHED,
      index: true,
    },
    verifiedPurchase: {
      type: Boolean,
      default: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: [0, 'Helpful count cannot be negative'],
    },
    moderationReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: [REVIEW_LIMITS.MODERATION_REASON_MAX_LENGTH, `Moderation reason cannot exceed ${REVIEW_LIMITS.MODERATION_REASON_MAX_LENGTH} characters`],
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        if (ret._id) {
          ret.id = ret._id.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// One review per customer per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// Efficient public listing & pagination
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

// Efficient rating breakdown & filtered queries
reviewSchema.index({ productId: 1, status: 1, rating: 1 });

// Customer review history queries
reviewSchema.index({ userId: 1, createdAt: -1 });

// Admin moderation filter queries
reviewSchema.index({ status: 1, createdAt: -1 });

export const Review = model<IReview>('Review', reviewSchema);
