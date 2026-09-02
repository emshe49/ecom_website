import { Types } from 'mongoose';
import {
  AuditCategory,
  AuditEventType,
  ActorType,
  AuditOutcome,
  TargetType,
} from './audit.constants.js';

export interface IAuditLog {
  _id: Types.ObjectId;
  eventType: AuditEventType | string;
  category: AuditCategory | string;
  action: string;
  actorType: ActorType;
  actorUserId?: Types.ObjectId | null;
  actorRoleSnapshot?: string | null;
  targetType?: TargetType | string | null;
  targetId?: string | null;
  targetDisplay?: string | null;
  outcome: AuditOutcome;
  failureCode?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  httpMethod?: string | null;
  route?: string | null;
  changedFields?: string[] | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  recordHash: string;
  previousHash: string;
  createdAt: Date;
}

export interface IAuditChainState {
  _id: string;
  latestHash: string;
  sequenceNumber: number;
  updatedAt: Date;
}

export interface AuditContext {
  actorUserId?: string | null;
  actorRoleSnapshot?: string | null;
  actorType?: ActorType;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  httpMethod?: string | null;
  route?: string | null;
}

export interface RecordAuditEventInput {
  eventType: AuditEventType | string;
  category: AuditCategory | string;
  action?: string;
  actor?: {
    actorType?: ActorType;
    actorUserId?: string | Types.ObjectId | null;
    actorRoleSnapshot?: string | null;
  };
  target?: {
    targetType?: TargetType | string | null;
    targetId?: string | null;
    targetDisplay?: string | null;
  };
  outcome: AuditOutcome;
  failureCode?: string | null;
  requestContext?: AuditContext;
  changedFields?: string[];
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

export interface AuditLogListQuery {
  eventType?: string;
  category?: string;
  actorUserId?: string;
  actorType?: string;
  targetType?: string;
  targetId?: string;
  outcome?: string;
  requestId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'createdAt' | 'eventType' | 'outcome';
  order?: 'asc' | 'desc';
}

export interface AuditLogListItemDTO {
  id: string;
  eventType: string;
  category: string;
  action: string;
  actorType: string;
  actorUserId: string | null;
  actorDisplayName: string;
  actorRoleSnapshot: string | null;
  targetType: string | null;
  targetId: string | null;
  targetDisplay: string | null;
  outcome: string;
  requestId: string | null;
  ipAddress: string | null;
  httpMethod: string | null;
  route: string | null;
  createdAt: string;
}

export interface AuditLogDetailDTO extends AuditLogListItemDTO {
  changedFields: string[] | null;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  metadata: Record<string, any> | null;
  failureCode: string | null;
  userAgent: string | null;
  recordHash: string;
  previousHash: string;
  isHashVerified?: boolean;
}
