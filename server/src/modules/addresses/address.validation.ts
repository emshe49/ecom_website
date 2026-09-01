import { z } from 'zod';

const phoneRegex = /^\+?[1-9]\d{6,14}$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const addressIdParamSchema = z.object({
  addressId: z
    .string({ required_error: 'Address ID is required' })
    .regex(objectIdRegex, 'Invalid address ID format'),
});

export const createAddressSchema = z
  .object({
    label: z
      .string()
      .trim()
      .max(50, 'Label cannot exceed 50 characters')
      .nullable()
      .optional(),
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(phoneRegex, 'Please provide a valid international phone number (e.g. +923001234567)'),
    country: z
      .string({ required_error: 'Country is required' })
      .trim()
      .min(2, 'Country must be at least 2 characters')
      .max(50, 'Country cannot exceed 50 characters')
      .toUpperCase(),
    stateProvince: z
      .string({ required_error: 'State / Province is required' })
      .trim()
      .min(2, 'State / Province must be at least 2 characters')
      .max(100, 'State / Province cannot exceed 100 characters'),
    city: z
      .string({ required_error: 'City is required' })
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(100, 'City cannot exceed 100 characters'),
    area: z
      .string()
      .trim()
      .max(100, 'Area cannot exceed 100 characters')
      .nullable()
      .optional(),
    postalCode: z
      .string()
      .trim()
      .max(20, 'Postal code cannot exceed 20 characters')
      .nullable()
      .optional(),
    addressLine1: z
      .string({ required_error: 'Address line 1 is required' })
      .trim()
      .min(5, 'Address line 1 must be at least 5 characters')
      .max(200, 'Address line 1 cannot exceed 200 characters'),
    addressLine2: z
      .string()
      .trim()
      .max(200, 'Address line 2 cannot exceed 200 characters')
      .nullable()
      .optional(),
    isDefaultShipping: z.boolean().optional(),
    isDefaultBilling: z.boolean().optional(),
  })
  .strict('Unexpected fields provided in address creation request');

export const updateAddressSchema = z
  .object({
    label: z
      .string()
      .trim()
      .max(50, 'Label cannot exceed 50 characters')
      .nullable()
      .optional(),
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters')
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, 'Please provide a valid international phone number (e.g. +923001234567)')
      .optional(),
    country: z
      .string()
      .trim()
      .min(2, 'Country must be at least 2 characters')
      .max(50, 'Country cannot exceed 50 characters')
      .toUpperCase()
      .optional(),
    stateProvince: z
      .string()
      .trim()
      .min(2, 'State / Province must be at least 2 characters')
      .max(100, 'State / Province cannot exceed 100 characters')
      .optional(),
    city: z
      .string()
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(100, 'City cannot exceed 100 characters')
      .optional(),
    area: z
      .string()
      .trim()
      .max(100, 'Area cannot exceed 100 characters')
      .nullable()
      .optional(),
    postalCode: z
      .string()
      .trim()
      .max(20, 'Postal code cannot exceed 20 characters')
      .nullable()
      .optional(),
    addressLine1: z
      .string()
      .trim()
      .min(5, 'Address line 1 must be at least 5 characters')
      .max(200, 'Address line 1 cannot exceed 200 characters')
      .optional(),
    addressLine2: z
      .string()
      .trim()
      .max(200, 'Address line 2 cannot exceed 200 characters')
      .nullable()
      .optional(),
    isDefaultShipping: z.boolean().optional(),
    isDefaultBilling: z.boolean().optional(),
  })
  .strict('Unexpected fields provided in address update request');

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
