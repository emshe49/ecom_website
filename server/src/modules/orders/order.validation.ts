import { z } from 'zod';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  FULFILLMENT_STATUS,
} from './order.constants.js';

export const createOrderSchema = z
  .object({
    customerNotes: z.string().trim().max(500, 'Customer notes cannot exceed 500 characters.').optional(),
  })
  .strict();

export const cancelOrderSchema = z
  .object({
    reason: z.string().trim().max(500, 'Cancellation reason cannot exceed 500 characters.').optional(),
  })
  .strict();

export const updateOrderStatusSchema = z
  .object({
    status: z.nativeEnum(ORDER_STATUS, {
      errorMap: () => ({ message: 'Invalid order status specified.' }),
    }),
    note: z.string().trim().max(500, 'Status change note cannot exceed 500 characters.').optional(),
  })
  .strict();

export const adminCancelOrderSchema = z
  .object({
    reason: z.string().trim().min(1, 'Cancellation reason is required.').max(500, 'Cancellation reason cannot exceed 500 characters.'),
  })
  .strict();

export const updateInternalNoteSchema = z
  .object({
    internalNotes: z.string().trim().max(2000, 'Internal notes cannot exceed 2000 characters.'),
  })
  .strict();

export const customerOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.nativeEnum(ORDER_STATUS).optional(),
  sort: z.enum(['newest', 'oldest', 'total-high', 'total-low']).default('newest'),
});

export const adminOrderQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    status: z.nativeEnum(ORDER_STATUS).optional(),
    paymentStatus: z.nativeEnum(PAYMENT_STATUS).optional(),
    fulfillmentStatus: z.nativeEnum(FULFILLMENT_STATUS).optional(),
    dateFrom: z.string().datetime({ offset: true }).optional(),
    dateTo: z.string().datetime({ offset: true }).optional(),
    sort: z.enum(['newest', 'oldest', 'total-high', 'total-low', 'status']).default('newest'),
  })
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    {
      message: 'dateFrom cannot be greater than dateTo.',
      path: ['dateFrom'],
    }
  );
