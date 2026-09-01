import { z } from 'zod';
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_PROVIDER } from './payment.constants.js';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
export const mongoIdSchema = z
  .string()
  .trim()
  .regex(mongoIdRegex, { message: 'Invalid MongoDB ObjectId format' });

export const initiatePaymentSchema = z
  .object({
    orderId: mongoIdSchema,
    method: z.nativeEnum(PAYMENT_METHOD, {
      errorMap: () => ({ message: 'Payment method must be ONLINE or CASH_ON_DELIVERY' }),
    }),
  })
  .strict({
    message: 'Extra fields like amount, currency, userId, or status are strictly forbidden',
  });

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const adminPaymentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(PAYMENT_STATUS).optional(),
    method: z.nativeEnum(PAYMENT_METHOD).optional(),
    provider: z.nativeEnum(PAYMENT_PROVIDER).optional(),
    search: z.string().trim().max(100).optional(),
    orderNumber: z.string().trim().max(50).optional(),
    dateFrom: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    dateTo: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
    sort: z
      .enum(['newest', 'oldest', 'amount-high', 'amount-low', 'paidAt'])
      .default('newest'),
  })
  .strict();

export type AdminPaymentQueryInput = z.infer<typeof adminPaymentQuerySchema>;

export const confirmCodSchema = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export type ConfirmCodInput = z.infer<typeof confirmCodSchema>;

export const testWebhookPayloadSchema = z
  .object({
    providerEventId: z.string().min(1),
    eventType: z.enum(['payment.succeeded', 'payment.failed', 'payment.cancelled']),
    providerPaymentId: z.string().min(1),
    providerTransactionId: z.string().optional(),
    failureCode: z.string().optional(),
    failureMessage: z.string().optional(),
    metadata: z
      .object({
        orderId: z.string().optional(),
        paymentId: z.string().optional(),
        attemptId: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();
