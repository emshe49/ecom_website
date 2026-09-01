import { z } from 'zod';
import { DISCOUNT_TYPE } from './promotion.constants.js';

export const applyCouponSchema = z
  .object({
    code: z
      .string({ required_error: 'Coupon code is required' })
      .trim()
      .min(3, 'Coupon code must be at least 3 characters')
      .max(40, 'Coupon code cannot exceed 40 characters')
      .regex(/^[A-Za-z0-9\-_]+$/, 'Coupon code can only contain letters, numbers, hyphens, and underscores'),
  })
  .strict();

export const createCouponSchema = z
  .object({
    code: z
      .string({ required_error: 'Coupon code is required' })
      .trim()
      .min(3, 'Coupon code must be at least 3 characters')
      .max(40, 'Coupon code cannot exceed 40 characters')
      .regex(/^[A-Za-z0-9\-_]+$/, 'Coupon code can only contain letters, numbers, hyphens, and underscores'),
    name: z
      .string({ required_error: 'Coupon name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    description: z.string().trim().max(500).optional().nullable(),
    discountType: z.enum([DISCOUNT_TYPE.PERCENTAGE, DISCOUNT_TYPE.FIXED_AMOUNT], {
      required_error: 'Valid discount type is required',
    }),
    discountValue: z
      .number({ required_error: 'Discount value is required' })
      .int('Discount value must be an integer')
      .positive('Discount value must be positive'),
    maxDiscountAmount: z
      .number()
      .int()
      .positive('Maximum discount amount must be positive')
      .optional()
      .nullable(),
    minimumOrderAmount: z
      .number()
      .int()
      .nonnegative('Minimum order amount cannot be negative')
      .optional()
      .nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    active: z.boolean().optional().default(true),
    usageLimit: z
      .number()
      .int()
      .positive('Global usage limit must be positive')
      .optional()
      .nullable(),
    perUserLimit: z
      .number()
      .int()
      .positive('Per-user limit must be positive')
      .optional()
      .nullable(),
    firstOrderOnly: z.boolean().optional().default(false),
    eligibleProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID')).optional().default([]),
    eligibleCategoryIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID')).optional().default([]),
    eligibleBrandIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Brand ID')).optional().default([]),
    excludedProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ID')).optional().default([]),
  })
  .strict()
  .refine(
    (data) => {
      if (data.discountType === DISCOUNT_TYPE.PERCENTAGE) {
        return data.discountValue >= 1 && data.discountValue <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount value must be between 1 and 100',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt) > new Date(data.startsAt);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endsAt'],
    }
  );

export const updateCouponSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    discountType: z.enum([DISCOUNT_TYPE.PERCENTAGE, DISCOUNT_TYPE.FIXED_AMOUNT]).optional(),
    discountValue: z.number().int().positive().optional(),
    maxDiscountAmount: z.number().int().positive().optional().nullable(),
    minimumOrderAmount: z.number().int().nonnegative().optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    active: z.boolean().optional(),
    usageLimit: z.number().int().positive().optional().nullable(),
    perUserLimit: z.number().int().positive().optional().nullable(),
    firstOrderOnly: z.boolean().optional(),
    eligibleProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    eligibleCategoryIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    eligibleBrandIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    excludedProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.discountType === DISCOUNT_TYPE.PERCENTAGE && data.discountValue !== undefined) {
        return data.discountValue >= 1 && data.discountValue <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount value must be between 1 and 100',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt) > new Date(data.startsAt);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endsAt'],
    }
  );

export const createPromotionSchema = z
  .object({
    name: z
      .string({ required_error: 'Promotion name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    description: z.string().trim().max(500).optional().nullable(),
    discountType: z.enum([DISCOUNT_TYPE.PERCENTAGE, DISCOUNT_TYPE.FIXED_AMOUNT], {
      required_error: 'Valid discount type is required',
    }),
    discountValue: z
      .number({ required_error: 'Discount value is required' })
      .int('Discount value must be an integer')
      .positive('Discount value must be positive'),
    maxDiscountAmount: z
      .number()
      .int()
      .positive('Maximum discount amount must be positive')
      .optional()
      .nullable(),
    minimumOrderAmount: z
      .number()
      .int()
      .nonnegative('Minimum order amount cannot be negative')
      .optional()
      .nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    active: z.boolean().optional().default(true),
    priority: z.number().int().optional().default(0),
    stackable: z.boolean().optional().default(false),
    eligibleProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional().default([]),
    eligibleCategoryIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional().default([]),
    eligibleBrandIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional().default([]),
    excludedProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional().default([]),
  })
  .strict()
  .refine(
    (data) => {
      if (data.discountType === DISCOUNT_TYPE.PERCENTAGE) {
        return data.discountValue >= 1 && data.discountValue <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount value must be between 1 and 100',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt) > new Date(data.startsAt);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endsAt'],
    }
  );

export const updatePromotionSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    discountType: z.enum([DISCOUNT_TYPE.PERCENTAGE, DISCOUNT_TYPE.FIXED_AMOUNT]).optional(),
    discountValue: z.number().int().positive().optional(),
    maxDiscountAmount: z.number().int().positive().optional().nullable(),
    minimumOrderAmount: z.number().int().nonnegative().optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    active: z.boolean().optional(),
    priority: z.number().int().optional(),
    stackable: z.boolean().optional(),
    eligibleProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    eligibleCategoryIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    eligibleBrandIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    excludedProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.discountType === DISCOUNT_TYPE.PERCENTAGE && data.discountValue !== undefined) {
        return data.discountValue >= 1 && data.discountValue <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount value must be between 1 and 100',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt) > new Date(data.startsAt);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endsAt'],
    }
  );

export const adminCouponQuerySchema = z
  .object({
    search: z.string().trim().optional(),
    active: z
      .string()
      .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
      .optional(),
    discountType: z.enum([DISCOUNT_TYPE.PERCENTAGE, DISCOUNT_TYPE.FIXED_AMOUNT]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const adminPromotionQuerySchema = z
  .object({
    search: z.string().trim().optional(),
    active: z
      .string()
      .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
      .optional(),
    discountType: z.enum([DISCOUNT_TYPE.PERCENTAGE, DISCOUNT_TYPE.FIXED_AMOUNT]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
