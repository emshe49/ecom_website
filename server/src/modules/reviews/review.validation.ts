import { z } from 'zod';
import {
  REVIEW_STATUS,
  REVIEW_STATUS_LIST,
  REVIEW_SORT_OPTIONS_LIST,
  REVIEW_LIMITS,
} from './review.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const mongoIdParamSchema = z
  .string({ required_error: 'ID is required' })
  .regex(objectIdRegex, 'Invalid ID format');

export const createReviewSchema = z
  .object({
    productId: z
      .string({ required_error: 'Product ID is required' })
      .regex(objectIdRegex, 'Invalid Product ID format'),
    rating: z
      .number({ required_error: 'Rating is required' })
      .int('Rating must be an integer')
      .min(REVIEW_LIMITS.RATING_MIN, `Rating must be at least ${REVIEW_LIMITS.RATING_MIN}`)
      .max(REVIEW_LIMITS.RATING_MAX, `Rating cannot exceed ${REVIEW_LIMITS.RATING_MAX}`),
    title: z
      .string()
      .trim()
      .max(REVIEW_LIMITS.TITLE_MAX_LENGTH, `Title cannot exceed ${REVIEW_LIMITS.TITLE_MAX_LENGTH} characters`)
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    body: z
      .string({ required_error: 'Review body is required' })
      .trim()
      .min(REVIEW_LIMITS.BODY_MIN_LENGTH, `Review body must be at least ${REVIEW_LIMITS.BODY_MIN_LENGTH} characters`)
      .max(REVIEW_LIMITS.BODY_MAX_LENGTH, `Review body cannot exceed ${REVIEW_LIMITS.BODY_MAX_LENGTH} characters`),
  })
  .strict();

export const updateReviewSchema = z
  .object({
    rating: z
      .number()
      .int('Rating must be an integer')
      .min(REVIEW_LIMITS.RATING_MIN, `Rating must be at least ${REVIEW_LIMITS.RATING_MIN}`)
      .max(REVIEW_LIMITS.RATING_MAX, `Rating cannot exceed ${REVIEW_LIMITS.RATING_MAX}`)
      .optional(),
    title: z
      .string()
      .trim()
      .max(REVIEW_LIMITS.TITLE_MAX_LENGTH, `Title cannot exceed ${REVIEW_LIMITS.TITLE_MAX_LENGTH} characters`)
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    body: z
      .string()
      .trim()
      .min(REVIEW_LIMITS.BODY_MIN_LENGTH, `Review body must be at least ${REVIEW_LIMITS.BODY_MIN_LENGTH} characters`)
      .max(REVIEW_LIMITS.BODY_MAX_LENGTH, `Review body cannot exceed ${REVIEW_LIMITS.BODY_MAX_LENGTH} characters`)
      .optional(),
  })
  .strict()
  .refine(
    (data) => data.rating !== undefined || data.title !== undefined || data.body !== undefined,
    {
      message: 'At least one field (rating, title, body) must be provided for update.',
    }
  );

export const moderateReviewSchema = z
  .object({
    status: z.enum(REVIEW_STATUS_LIST, {
      required_error: 'Status is required for moderation',
    }),
    reason: z
      .string()
      .trim()
      .max(
        REVIEW_LIMITS.MODERATION_REASON_MAX_LENGTH,
        `Reason cannot exceed ${REVIEW_LIMITS.MODERATION_REASON_MAX_LENGTH} characters`
      )
      .optional()
      .nullable(),
  })
  .strict()
  .refine(
    (data) => {
      if (
        (data.status === REVIEW_STATUS.HIDDEN || data.status === REVIEW_STATUS.REJECTED) &&
        (!data.reason || data.reason.trim().length < REVIEW_LIMITS.MODERATION_REASON_MIN_LENGTH)
      ) {
        return false;
      }
      return true;
    },
    {
      message: `Moderation reason is required (minimum ${REVIEW_LIMITS.MODERATION_REASON_MIN_LENGTH} characters) when hiding or rejecting a review.`,
      path: ['reason'],
    }
  );

export const publicReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(REVIEW_LIMITS.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(REVIEW_LIMITS.MAX_LIMIT).default(REVIEW_LIMITS.DEFAULT_LIMIT),
  rating: z.coerce.number().int().min(REVIEW_LIMITS.RATING_MIN).max(REVIEW_LIMITS.RATING_MAX).optional(),
  sort: z.enum(REVIEW_SORT_OPTIONS_LIST).default('newest'),
});

export const customerReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(REVIEW_LIMITS.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(REVIEW_LIMITS.MAX_LIMIT).default(REVIEW_LIMITS.DEFAULT_LIMIT),
  status: z.enum(REVIEW_STATUS_LIST).optional(),
  sort: z.enum(['newest', 'oldest', 'rating-high', 'rating-low']).default('newest'),
});

export const adminReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(REVIEW_LIMITS.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(REVIEW_LIMITS.MAX_LIMIT).default(REVIEW_LIMITS.DEFAULT_LIMIT),
  search: z.string().trim().max(100).optional(),
  status: z.enum(REVIEW_STATUS_LIST).optional(),
  rating: z.coerce.number().int().min(REVIEW_LIMITS.RATING_MIN).max(REVIEW_LIMITS.RATING_MAX).optional(),
  productId: z.string().regex(objectIdRegex, 'Invalid Product ID format').optional(),
  userId: z.string().regex(objectIdRegex, 'Invalid User ID format').optional(),
  verifiedPurchase: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  sort: z.enum(['newest', 'oldest', 'rating-high', 'rating-low', 'helpful']).default('newest'),
});
