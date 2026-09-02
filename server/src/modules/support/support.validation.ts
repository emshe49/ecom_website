import { z } from 'zod';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  SUPPORT_CONFIG,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './support.constants.js';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = z
  .string()
  .trim()
  .regex(mongoIdRegex, { message: 'Invalid MongoDB ObjectId' });

export const createCustomerTicketSchema = z
  .object({
    subject: z
      .string({ required_error: 'Subject is required' })
      .trim()
      .min(SUPPORT_CONFIG.MIN_SUBJECT_LENGTH, {
        message: `Subject must be at least ${SUPPORT_CONFIG.MIN_SUBJECT_LENGTH} characters`,
      })
      .max(SUPPORT_CONFIG.MAX_SUBJECT_LENGTH, {
        message: `Subject cannot exceed ${SUPPORT_CONFIG.MAX_SUBJECT_LENGTH} characters`,
      }),
    category: z.enum(TICKET_CATEGORIES as [TicketCategory, ...TicketCategory[]], {
      required_error: 'Category is required',
    }),
    message: z
      .string({ required_error: 'Message is required' })
      .trim()
      .min(SUPPORT_CONFIG.MIN_MESSAGE_LENGTH, {
        message: 'Message cannot be empty',
      })
      .max(SUPPORT_CONFIG.MAX_MESSAGE_LENGTH, {
        message: `Message cannot exceed ${SUPPORT_CONFIG.MAX_MESSAGE_LENGTH} characters`,
      }),
    relatedOrderId: objectIdSchema.optional(),
    relatedPaymentId: objectIdSchema.optional(),
    relatedShipmentId: objectIdSchema.optional(),
    relatedReturnId: objectIdSchema.optional(),
    relatedRefundId: objectIdSchema.optional(),
  })
  .strict();

export const customerReplySchema = z
  .object({
    message: z
      .string({ required_error: 'Message is required' })
      .trim()
      .min(SUPPORT_CONFIG.MIN_MESSAGE_LENGTH, {
        message: 'Message cannot be empty',
      })
      .max(SUPPORT_CONFIG.MAX_MESSAGE_LENGTH, {
        message: `Message cannot exceed ${SUPPORT_CONFIG.MAX_MESSAGE_LENGTH} characters`,
      }),
  })
  .strict();

export const staffReplySchema = z
  .object({
    message: z
      .string({ required_error: 'Message is required' })
      .trim()
      .min(SUPPORT_CONFIG.MIN_MESSAGE_LENGTH, {
        message: 'Message cannot be empty',
      })
      .max(SUPPORT_CONFIG.MAX_MESSAGE_LENGTH, {
        message: `Message cannot exceed ${SUPPORT_CONFIG.MAX_MESSAGE_LENGTH} characters`,
      }),
  })
  .strict();

export const internalNoteSchema = z
  .object({
    message: z
      .string({ required_error: 'Internal note message is required' })
      .trim()
      .min(SUPPORT_CONFIG.MIN_MESSAGE_LENGTH, {
        message: 'Internal note cannot be empty',
      })
      .max(SUPPORT_CONFIG.MAX_MESSAGE_LENGTH, {
        message: `Internal note cannot exceed ${SUPPORT_CONFIG.MAX_MESSAGE_LENGTH} characters`,
      }),
  })
  .strict();

export const assignTicketSchema = z
  .object({
    staffUserId: objectIdSchema,
  })
  .strict();

export const updatePrioritySchema = z
  .object({
    priority: z.enum(TICKET_PRIORITIES as [TicketPriority, ...TicketPriority[]], {
      required_error: 'Priority is required',
    }),
  })
  .strict();

export const updateStatusSchema = z
  .object({
    status: z.enum(TICKET_STATUSES as [TicketStatus, ...TicketStatus[]], {
      required_error: 'Status is required',
    }),
  })
  .strict();

export const resolveTicketSchema = z
  .object({
    resolutionSummary: z
      .string({ required_error: 'Resolution summary is required' })
      .trim()
      .min(SUPPORT_CONFIG.MIN_RESOLUTION_LENGTH, {
        message: `Resolution summary must be at least ${SUPPORT_CONFIG.MIN_RESOLUTION_LENGTH} characters`,
      })
      .max(SUPPORT_CONFIG.MAX_RESOLUTION_LENGTH, {
        message: `Resolution summary cannot exceed ${SUPPORT_CONFIG.MAX_RESOLUTION_LENGTH} characters`,
      }),
  })
  .strict();

export const supportQueueQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES as [TicketStatus, ...TicketStatus[]]).optional(),
  priority: z.enum(TICKET_PRIORITIES as [TicketPriority, ...TicketPriority[]]).optional(),
  category: z.enum(TICKET_CATEGORIES as [TicketCategory, ...TicketCategory[]]).optional(),
  assignedTo: objectIdSchema.optional(),
  unassigned: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional(),
  customerId: objectIdSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(SUPPORT_CONFIG.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SUPPORT_CONFIG.MAX_LIMIT)
    .default(SUPPORT_CONFIG.DEFAULT_LIMIT),
  sort: z
    .enum(['newest', 'oldest', 'priority', 'lastActivity'])
    .default('lastActivity'),
});

export const customerTicketListQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES as [TicketStatus, ...TicketStatus[]]).optional(),
  category: z.enum(TICKET_CATEGORIES as [TicketCategory, ...TicketCategory[]]).optional(),
  page: z.coerce.number().int().min(1).default(SUPPORT_CONFIG.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SUPPORT_CONFIG.MAX_LIMIT)
    .default(SUPPORT_CONFIG.DEFAULT_LIMIT),
  sort: z.enum(['newest', 'oldest', 'lastActivity']).default('lastActivity'),
});
