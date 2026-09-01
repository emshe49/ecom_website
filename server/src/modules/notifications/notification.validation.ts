import { z } from 'zod';
import { NOTIFICATION_CATEGORY } from './notification.constants.js';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['unread', 'read']).optional(),
  category: z.nativeEnum(NOTIFICATION_CATEGORY).optional(),
});

export const markNotificationReadSchema = z.object({
  notificationId: z
    .string({ required_error: 'Notification ID is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID format'),
});

export const updatePreferenceSchema = z
  .object({
    orders: z.boolean().optional(),
    payments: z.boolean().optional(),
    shipping: z.boolean().optional(),
    reviews: z.boolean().optional(),
    returns: z.boolean().optional(),
    refunds: z.boolean().optional(),
    promotions: z.boolean().optional(),
    inventory: z.boolean().optional(),
    system: z.boolean().optional(),
  })
  .strict('Unexpected fields in preference payload');
