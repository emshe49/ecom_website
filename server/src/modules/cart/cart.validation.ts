import { z } from 'zod';
import {
  MIN_CART_ITEM_QUANTITY,
  MAX_CART_ITEM_QUANTITY,
} from './cart.constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const cartVariantParamSchema = z
  .object({
    variantId: z
      .string({ required_error: 'Variant ID is required' })
      .regex(objectIdRegex, 'Invalid variant ID format'),
  })
  .strict();

export const addToCartSchema = z
  .object({
    variantId: z
      .string({ required_error: 'Variant ID is required' })
      .regex(objectIdRegex, 'Invalid variant ID format'),
    quantity: z
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(
        MIN_CART_ITEM_QUANTITY,
        `Quantity must be at least ${MIN_CART_ITEM_QUANTITY}`
      )
      .max(
        MAX_CART_ITEM_QUANTITY,
        `Quantity cannot exceed ${MAX_CART_ITEM_QUANTITY}`
      ),
  })
  .strict();

export const updateCartItemSchema = z
  .object({
    quantity: z
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(
        MIN_CART_ITEM_QUANTITY,
        `Quantity must be at least ${MIN_CART_ITEM_QUANTITY}`
      )
      .max(
        MAX_CART_ITEM_QUANTITY,
        `Quantity cannot exceed ${MAX_CART_ITEM_QUANTITY}`
      ),
  })
  .strict();
