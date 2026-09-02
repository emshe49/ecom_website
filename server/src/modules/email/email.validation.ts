import { z } from 'zod';
import { EMAIL_STATUS, EMAIL_PROVIDER } from './email.constants.js';

export const updateEmailPreferenceSchema = z.object({
  orders: z.boolean().optional(),
  payments: z.boolean().optional(),
  shipping: z.boolean().optional(),
  reviews: z.boolean().optional(),
  returns: z.boolean().optional(),
  refunds: z.boolean().optional(),
  marketing: z.boolean().optional(),
}).strict();

export const adminEmailQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(EMAIL_STATUS).optional(),
  template: z.string().optional(),
  provider: z.nativeEnum(EMAIL_PROVIDER).optional(),
  recipient: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  providerMessageId: z.string().optional(),
});
