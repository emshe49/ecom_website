import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const addWishlistItemSchema = z
  .object({
    productId: z
      .string({
        required_error: 'Product ID is required.',
        invalid_type_error: 'Product ID must be a string.',
      })
      .regex(objectIdRegex, 'Invalid Product ID format.'),
  })
  .strict();

export const wishlistProductParamSchema = z
  .object({
    productId: z
      .string({
        required_error: 'Product ID is required.',
        invalid_type_error: 'Product ID must be a string.',
      })
      .regex(objectIdRegex, 'Invalid Product ID format.'),
  })
  .strict();
