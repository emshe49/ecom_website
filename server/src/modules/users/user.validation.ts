import { z } from 'zod';

// E.164 international phone number regex (allowing 7 to 15 digits with optional leading +)
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const updateProfileSchema = z
  .object({
    firstName: z
      .string({ invalid_type_error: 'First name must be a string' })
      .trim()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name cannot exceed 50 characters')
      .optional(),
    lastName: z
      .string({ invalid_type_error: 'Last name must be a string' })
      .trim()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name cannot exceed 50 characters')
      .optional(),
    phone: z
      .string({ invalid_type_error: 'Phone must be a string' })
      .trim()
      .regex(phoneRegex, 'Please provide a valid international phone number (e.g. +923001234567)')
      .nullable()
      .optional(),
    avatarUrl: z
      .string({ invalid_type_error: 'Avatar URL must be a string' })
      .trim()
      .url('Avatar URL must be a valid URL')
      .nullable()
      .optional(),
  })
  .strict('Unexpected fields provided in profile update request');

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
