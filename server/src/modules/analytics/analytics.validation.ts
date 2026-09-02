import { z } from 'zod';
import {
  ANALYTICS_CONSTANTS,
  ANALYTICS_GROUP_BY,
  REPORT_SORT_WHITELISTS,
  SORT_ORDERS,
} from './analytics.constants.js';

const baseAnalyticsObject = z.object({
  from: z
    .string()
    .datetime({ message: 'from must be a valid ISO 8601 date string' })
    .optional(),
  to: z
    .string()
    .datetime({ message: 'to must be a valid ISO 8601 date string' })
    .optional(),
  groupBy: z
    .nativeEnum(ANALYTICS_GROUP_BY, {
      errorMap: () => ({
        message: `groupBy must be one of: ${Object.values(ANALYTICS_GROUP_BY).join(', ')}`,
      }),
    })
    .optional()
    .default(ANALYTICS_GROUP_BY.DAY),
  page: z.coerce
    .number()
    .int()
    .min(1, 'page must be at least 1')
    .default(ANALYTICS_CONSTANTS.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'limit must be at least 1')
    .max(ANALYTICS_CONSTANTS.MAX_LIMIT, `limit cannot exceed ${ANALYTICS_CONSTANTS.MAX_LIMIT}`)
    .default(ANALYTICS_CONSTANTS.DEFAULT_LIMIT),
  sortBy: z.string().trim().optional(),
  sortOrder: z
    .nativeEnum(SORT_ORDERS)
    .optional()
    .default(SORT_ORDERS.DESC),
});

function applyDateRefinements<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (data: any) => {
        if (data.from && data.to) {
          const fromDate = new Date(data.from);
          const toDate = new Date(data.to);
          return fromDate.getTime() <= toDate.getTime();
        }
        return true;
      },
      {
        message: "'from' date must be earlier than or equal to 'to' date",
        path: ['from'],
      }
    )
    .refine(
      (data: any) => {
        if (data.from && data.to) {
          const fromDate = new Date(data.from);
          const toDate = new Date(data.to);
          const diffMs = toDate.getTime() - fromDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays <= ANALYTICS_CONSTANTS.MAX_RANGE_DAYS;
        }
        return true;
      },
      {
        message: `Date range cannot exceed ${ANALYTICS_CONSTANTS.MAX_RANGE_DAYS} days (3 years)`,
        path: ['to'],
      }
    );
}

export const baseAnalyticsQuerySchema = applyDateRefinements(baseAnalyticsObject);

export const salesQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.sales.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.sales.join(', ')}`,
      })
      .optional(),
  })
);

export const ordersQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    status: z.string().trim().max(50).optional(),
    paymentStatus: z.string().trim().max(50).optional(),
    paymentMethod: z.string().trim().max(50).optional(),
    customerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid customerId ObjectId').optional(),
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.orders.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.orders.join(', ')}`,
      })
      .optional(),
  })
);

export const paymentsQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    method: z.string().trim().max(50).optional(),
    status: z.string().trim().max(50).optional(),
    provider: z.string().trim().max(50).optional(),
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.payments.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.payments.join(', ')}`,
      })
      .optional(),
  })
);

export const productsQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid categoryId ObjectId').optional(),
    brandId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid brandId ObjectId').optional(),
    status: z.string().trim().max(50).optional(),
    search: z.string().trim().max(100).optional(),
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.products.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.products.join(', ')}`,
      })
      .optional(),
  })
);

export const categoriesQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.categories.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.categories.join(', ')}`,
      })
      .optional(),
  })
);

export const brandsQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.brands.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.brands.join(', ')}`,
      })
      .optional(),
  })
);

export const customersQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    search: z.string().trim().max(100).optional(),
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.customers.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.customers.join(', ')}`,
      })
      .optional(),
  })
);

export const inventoryQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    search: z.string().trim().max(100).optional(),
    lowStockOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.inventory.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.inventory.join(', ')}`,
      })
      .optional(),
  })
);

export const returnsQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.returns.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.returns.join(', ')}`,
      })
      .optional(),
  })
);

export const refundsQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.refunds.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.refunds.join(', ')}`,
      })
      .optional(),
  })
);

export const promotionsQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.promotions.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.promotions.join(', ')}`,
      })
      .optional(),
  })
);

export const shippingQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    carrier: z.string().trim().max(50).optional(),
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.shipping.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.shipping.join(', ')}`,
      })
      .optional(),
  })
);

export const reviewsQuerySchema = applyDateRefinements(
  baseAnalyticsObject.extend({
    sortBy: z
      .string()
      .refine((val) => !val || REPORT_SORT_WHITELISTS.reviews.includes(val as any), {
        message: `sortBy must be one of: ${REPORT_SORT_WHITELISTS.reviews.join(', ')}`,
      })
      .optional(),
  })
);
