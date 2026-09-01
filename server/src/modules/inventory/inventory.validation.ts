import { z } from 'zod';
import {
  STOCK_STATUS,
  TRANSACTION_TYPE,
} from './inventory.constants.js';

export const stockAdjustmentSchema = z
  .object({
    type: z.enum([
      TRANSACTION_TYPE.STOCK_IN,
      TRANSACTION_TYPE.STOCK_OUT,
      TRANSACTION_TYPE.ADJUSTMENT,
    ]),
    quantity: z
      .number({
        invalid_type_error: 'Quantity must be an integer.',
      })
      .int('Quantity must be an integer.')
      .positive('Quantity must be a positive integer.')
      .optional(),
    newOnHand: z
      .number({
        invalid_type_error: 'New on-hand must be an integer.',
      })
      .int('New on-hand must be an integer.')
      .min(0, 'New on-hand cannot be negative.')
      .optional(),
    reason: z
      .string({
        required_error: 'Reason is required.',
      })
      .trim()
      .min(2, 'Reason must be at least 2 characters.')
      .max(500, 'Reason cannot exceed 500 characters.'),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.type === TRANSACTION_TYPE.STOCK_IN ||
      data.type === TRANSACTION_TYPE.STOCK_OUT
    ) {
      if (data.quantity === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Quantity is required for ${data.type} adjustment.`,
          path: ['quantity'],
        });
      }
    } else if (data.type === TRANSACTION_TYPE.ADJUSTMENT) {
      if (data.newOnHand === undefined && data.quantity === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either newOnHand or quantity is required for absolute ADJUSTMENT.',
          path: ['newOnHand'],
        });
      }
    }
  });


export const updateThresholdSchema = z
  .object({
    lowStockThreshold: z
      .number({
        required_error: 'Low stock threshold is required.',
        invalid_type_error: 'Low stock threshold must be an integer.',
      })
      .int('Low stock threshold must be an integer.')
      .min(0, 'Low stock threshold cannot be negative.'),
  })
  .strict();

export const inventoryFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum([
    STOCK_STATUS.IN_STOCK,
    STOCK_STATUS.LOW_STOCK,
    STOCK_STATUS.OUT_OF_STOCK,
  ]).optional(),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  lowStockOnly: z.coerce.boolean().optional(),
  sortBy: z
    .enum([
      'onHand',
      'reserved',
      'available',
      'updatedAt',
      'sku',
      'productName',
    ])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const inventoryVariantParamSchema = z.object({
  variantId: z
    .string({
      required_error: 'Variant ID is required.',
    })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid variant ID format.'),
});

export const transactionFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z
    .enum([
      TRANSACTION_TYPE.STOCK_IN,
      TRANSACTION_TYPE.STOCK_OUT,
      TRANSACTION_TYPE.ADJUSTMENT,
      TRANSACTION_TYPE.RESERVATION,
      TRANSACTION_TYPE.RELEASE,
    ])
    .optional(),
});
