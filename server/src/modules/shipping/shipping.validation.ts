import { z } from 'zod';
import {
  SHIPMENT_STATUS,
  SHIPPING_METHOD_TYPE,
} from './shipping.constants.js';

// Safe HTTP/HTTPS URL validator rejecting javascript:, data:, etc.
const safeHttpUrlSchema = z
  .string()
  .trim()
  .max(1000, 'URL is too long')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: 'Tracking URL must be a valid HTTP or HTTPS address.',
    }
  );

export const shippingQuoteSchema = z
  .object({
    shippingAddressId: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID format.'),
  })
  .strict();

export const createShippingMethodSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, 'Code must be at least 2 characters')
      .max(50, 'Code must not exceed 50 characters')
      .regex(
        /^[A-Z0-9_-]+$/,
        'Code must contain only uppercase alphanumeric characters, underscores, or hyphens'
      ),
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    description: z.string().trim().max(500).nullable().optional(),
    type: z.nativeEnum(SHIPPING_METHOD_TYPE).optional(),
    baseFee: z
      .number({
        required_error: 'Base fee is required.',
        invalid_type_error: 'Base fee must be an integer in minor units.',
      })
      .int('Base fee must be an integer minor unit (e.g. 25000 for PKR 250.00).')
      .min(0, 'Base fee cannot be negative.'),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(3)
      .optional()
      .default('PKR'),
    estimatedMinDays: z
      .number({
        required_error: 'Estimated min days is required.',
      })
      .int('Estimated min days must be an integer.')
      .min(0, 'Estimated min days cannot be negative.'),
    estimatedMaxDays: z
      .number({
        required_error: 'Estimated max days is required.',
      })
      .int('Estimated max days must be an integer.')
      .min(0, 'Estimated max days cannot be negative.'),
    active: z.boolean().optional().default(true),
    sortOrder: z.number().int().optional().default(0),
    displayOrder: z.number().int().optional(),
    freeAboveSubtotal: z.number().int().min(0).nullable().optional(),
    eligibility: z
      .object({
        minimumOrderAmount: z.number().int().min(0).nullable().optional(),
        maximumOrderAmount: z.number().int().min(0).nullable().optional(),
        allowedCountries: z.array(z.string().trim().toUpperCase()).optional(),
        allowedRegions: z.array(z.string().trim()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (data) => data.estimatedMaxDays >= data.estimatedMinDays,
    {
      message: 'Estimated max days must be greater than or equal to estimated min days.',
      path: ['estimatedMaxDays'],
    }
  );

export const updateShippingMethodSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(
        /^[A-Z0-9_-]+$/,
        'Code must contain only uppercase alphanumeric characters, underscores, or hyphens'
      )
      .optional(),
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    type: z.nativeEnum(SHIPPING_METHOD_TYPE).optional(),
    baseFee: z
      .number()
      .int('Base fee must be an integer minor unit.')
      .min(0, 'Base fee cannot be negative.')
      .optional(),
    currency: z.string().trim().toUpperCase().min(3).max(3).optional(),
    estimatedMinDays: z.number().int().min(0).optional(),
    estimatedMaxDays: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    displayOrder: z.number().int().optional(),
    freeAboveSubtotal: z.number().int().min(0).nullable().optional(),
    eligibility: z
      .object({
        minimumOrderAmount: z.number().int().min(0).nullable().optional(),
        maximumOrderAmount: z.number().int().min(0).nullable().optional(),
        allowedCountries: z.array(z.string().trim().toUpperCase()).optional(),
        allowedRegions: z.array(z.string().trim()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (
        data.estimatedMinDays !== undefined &&
        data.estimatedMaxDays !== undefined
      ) {
        return data.estimatedMaxDays >= data.estimatedMinDays;
      }
      return true;
    },
    {
      message: 'Estimated max days must be greater than or equal to estimated min days.',
      path: ['estimatedMaxDays'],
    }
  );

export const createShipmentSchema = z
  .object({
    carrier: z.string().trim().max(100).optional(),
    carrierName: z.string().trim().max(100).optional(),
    service: z.string().trim().max(100).nullable().optional(),
    trackingNumber: z.string().trim().min(1).max(100).nullable().optional(),
    trackingUrl: safeHttpUrlSchema.nullable().optional(),
    initialNote: z.string().trim().max(500).nullable().optional(),
    internalNotes: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const updateShipmentStatusSchema = z
  .object({
    status: z.nativeEnum(SHIPMENT_STATUS, {
      required_error: 'Shipment status is required.',
    }),
    note: z.string().trim().max(500, 'Note cannot exceed 500 characters').nullable().optional(),
    trackingNumber: z.string().trim().min(1).max(100).nullable().optional(),
    trackingUrl: safeHttpUrlSchema.nullable().optional(),
  })
  .strict();

export const updateShipmentTrackingSchema = z
  .object({
    carrier: z
      .string({
        required_error: 'Carrier name is required.',
      })
      .trim()
      .min(1, 'Carrier is required')
      .max(100),
    service: z.string().trim().max(100).nullable().optional(),
    trackingNumber: z.string().trim().min(1).max(100).nullable().optional(),
    trackingUrl: safeHttpUrlSchema.nullable().optional(),
  })
  .strict();

export const adminShipmentListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.nativeEnum(SHIPMENT_STATUS).optional(),
    carrier: z.string().trim().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    orderNumber: z.string().trim().max(100).optional(),
    trackingNumber: z.string().trim().max(100).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    sort: z.string().trim().max(50).optional().default('-createdAt'),
  })
  .strict();
