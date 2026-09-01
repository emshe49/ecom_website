import { Schema, model } from 'mongoose';
import { IReviewHelpfulVote } from './review.types.js';

const reviewHelpfulVoteSchema = new Schema<IReviewHelpfulVote>(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      required: [true, 'Review ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

// Prevent duplicate helpful votes by same user on same review
reviewHelpfulVoteSchema.index({ reviewId: 1, userId: 1 }, { unique: true });

export const ReviewHelpfulVote = model<IReviewHelpfulVote>(
  'ReviewHelpfulVote',
  reviewHelpfulVoteSchema
);
