import { z } from 'zod';

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const profileFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters'),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Please enter a valid international phone number (e.g. +923001234567)')
    .or(z.literal(''))
    .optional()
    .nullable(),
  avatarUrl: z
    .string()
    .trim()
    .url('Please enter a valid image URL')
    .or(z.literal(''))
    .optional()
    .nullable(),
});

export const addressFormSchema = z.object({
  label: z.string().trim().max(50, 'Label cannot exceed 50 characters').optional().nullable(),
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(phoneRegex, 'Please enter a valid international phone number (e.g. +923001234567)'),
  country: z
    .string({ required_error: 'Country is required' })
    .trim()
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country cannot exceed 50 characters'),
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
  area: z.string().trim().max(100, 'Area cannot exceed 100 characters').optional().nullable(),
  postalCode: z.string().trim().max(20, 'Postal code cannot exceed 20 characters').optional().nullable(),
  addressLine1: z
    .string({ required_error: 'Address line 1 is required' })
    .trim()
    .min(5, 'Address line 1 must be at least 5 characters')
    .max(200, 'Address line 1 cannot exceed 200 characters'),
  addressLine2: z.string().trim().max(200, 'Address line 2 cannot exceed 200 characters').optional().nullable(),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type AddressFormValues = z.infer<typeof addressFormSchema>;
