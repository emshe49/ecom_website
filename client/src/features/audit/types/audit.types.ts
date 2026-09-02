export type AuditCategory =
  | 'AUTH'
  | 'USER'
  | 'RBAC'
  | 'CATALOG'
  | 'INVENTORY'
  | 'ORDER'
  | 'PAYMENT'
  | 'REFUND'
  | 'SHIPPING'
  | 'PROMOTION'
  | 'REVIEW'
  | 'SUPPORT'
  | 'SECURITY'
  | 'SYSTEM';

export type ActorType =
  | 'USER'
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'SYSTEM'
  | 'CRON'
  | 'WEBHOOK'
  | 'ANONYMOUS';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';

export interface AuditLogListItem {
  id: string;
  eventType: string;
  category: AuditCategory;
  action: string;
  actorType: ActorType;
  actorUserId: string | null;
  actorDisplayName: string;
  actorRoleSnapshot: string | null;
  targetType: string | null;
  targetId: string | null;
  targetDisplay: string | null;
  outcome: AuditOutcome;
  requestId: string | null;
  ipAddress: string | null;
  httpMethod: string | null;
  route: string | null;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLogListItem {
  failureCode: string | null;
  userAgent: string | null;
  changedFields: string[] | null;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  metadata: Record<string, any> | null;
  recordHash: string;
  previousHash: string;
  isHashVerified: boolean;
}

export interface AuditLogListResponse {
  items: AuditLogListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditFilterParams {
  eventType?: string;
  category?: AuditCategory | '';
  actorType?: ActorType | '';
  actorUserId?: string;
  targetType?: string;
  targetId?: string;
  outcome?: AuditOutcome | '';
  requestId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'createdAt' | 'eventType' | 'outcome';
  order?: 'asc' | 'desc';
}

export interface AuditVerificationResult {
  verified: boolean;
  computedHash: string;
  storedHash: string;
  previousHash: string;
}
