import { z } from 'zod';
import {
  AUDIT_CATEGORY,
  ACTOR_TYPE,
  AUDIT_OUTCOME,
} from './audit.constants.js';

export const auditQuerySchema = z
  .object({
    eventType: z.string().trim().optional(),
    category: z.nativeEnum(AUDIT_CATEGORY as any).optional(),
    actorUserId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid actor user ID').optional(),
    actorType: z.nativeEnum(ACTOR_TYPE as any).optional(),
    targetType: z.string().trim().optional(),
    targetId: z.string().trim().optional(),
    outcome: z.nativeEnum(AUDIT_OUTCOME as any).optional(),
    requestId: z.string().trim().optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    sort: z.enum(['createdAt', 'eventType', 'outcome']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
