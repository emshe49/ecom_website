import { Types } from 'mongoose';
import { AuditLog } from './audit.model.js';
import { User } from '../users/user.model.js';
import {
  AuditLogListQuery,
  AuditLogListItemDTO,
  AuditLogDetailDTO,
} from './audit.types.js';
import { AUDIT_CONSTANTS } from './audit.constants.js';
import { auditHashService } from './audit-hash.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export class AuditQueryService {
  /**
   * Builds Mongoose filter from query parameters with strict date bounding and injection safety.
   */
  private buildQueryFilter(query: AuditLogListQuery): Record<string, any> {
    const filter: Record<string, any> = {};

    if (query.eventType) {
      filter.eventType = String(query.eventType);
    }

    if (query.category) {
      filter.category = String(query.category);
    }

    if (query.actorUserId && Types.ObjectId.isValid(query.actorUserId)) {
      filter.actorUserId = new Types.ObjectId(query.actorUserId);
    }

    if (query.actorType) {
      filter.actorType = String(query.actorType);
    }

    if (query.targetType) {
      filter.targetType = String(query.targetType);
    }

    if (query.targetId) {
      filter.targetId = String(query.targetId);
    }

    if (query.outcome) {
      filter.outcome = String(query.outcome);
    }

    if (query.requestId) {
      filter.requestId = String(query.requestId);
    }

    // Date range bounding
    let fromDate: Date;
    let toDate: Date;

    if (query.to) {
      toDate = new Date(query.to);
      if (isNaN(toDate.getTime())) {
        throw new AppError('Invalid "to" date parameter.', 400, ErrorCodes.ERR_AUDIT_INVALID_DATE_RANGE);
      }
    } else {
      toDate = new Date();
    }

    if (query.from) {
      fromDate = new Date(query.from);
      if (isNaN(fromDate.getTime())) {
        throw new AppError('Invalid "from" date parameter.', 400, ErrorCodes.ERR_AUDIT_INVALID_DATE_RANGE);
      }
    } else {
      // Default to last 30 days
      fromDate = new Date(toDate.getTime() - AUDIT_CONSTANTS.DEFAULT_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000);
    }

    if (fromDate > toDate) {
      throw new AppError(
        '"from" date must be earlier than or equal to "to" date.',
        400,
        ErrorCodes.ERR_AUDIT_INVALID_DATE_RANGE
      );
    }

    // Check 365-day maximum range limit unless exact ID or request ID is provided
    const isTargetedSearch = Boolean(query.requestId || query.targetId);
    const rangeDays = (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000);

    if (!isTargetedSearch && rangeDays > AUDIT_CONSTANTS.MAX_DATE_RANGE_DAYS) {
      throw new AppError(
        `Audit search range cannot exceed ${AUDIT_CONSTANTS.MAX_DATE_RANGE_DAYS} days.`,
        400,
        ErrorCodes.ERR_AUDIT_RANGE_TOO_LARGE
      );
    }

    filter.createdAt = { $gte: fromDate, $lte: toDate };

    // Text search on targetDisplay, requestId, eventType
    if (query.search && query.search.trim()) {
      const sanitizedSearch = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { targetDisplay: { $regex: sanitizedSearch, $options: 'i' } },
        { requestId: { $regex: sanitizedSearch, $options: 'i' } },
        { eventType: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    return filter;
  }

  /**
   * Lists audit logs with pagination and batch actor resolution (no N+1).
   */
  async listAuditLogs(query: AuditLogListQuery): Promise<{
    items: AuditLogListItemDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filter = this.buildQueryFilter(query);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(
      AUDIT_CONSTANTS.MAX_PAGE_SIZE,
      Math.max(1, Number(query.limit) || AUDIT_CONSTANTS.DEFAULT_PAGE_SIZE)
    );
    const skip = (page - 1) * limit;

    // Allowed sort keys
    const sortField = query.sort === 'eventType' || query.sort === 'outcome' ? query.sort : 'createdAt';
    const sortOrder = query.order === 'asc' ? 1 : -1;

    // AC-83: Exclude heavy before, after, metadata snapshots from list projection
    const [docs, total] = await Promise.all([
      AuditLog.find(filter)
        .select('-before -after -metadata')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    // AC-85: Batch resolve actor display names in a single query
    const actorUserIds = Array.from(
      new Set(
        docs
          .map((d) => d.actorUserId?.toString())
          .filter((id): id is string => Boolean(id))
      )
    );

    const users =
      actorUserIds.length > 0
        ? await User.find({ _id: { $in: actorUserIds.map((id) => new Types.ObjectId(id)) } })
            .select('firstName lastName email')
            .lean()
        : [];

    const userMap = new Map<string, string>();
    for (const u of users) {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
      userMap.set(u._id.toString(), name);
    }

    const items: AuditLogListItemDTO[] = docs.map((doc) => {
      let actorDisplayName: string = doc.actorType;
      if (doc.actorUserId) {
        actorDisplayName = userMap.get(doc.actorUserId.toString()) || 'Deleted User';
      }

      return {
        id: doc._id.toString(),
        eventType: doc.eventType,
        category: doc.category,
        action: doc.action,
        actorType: doc.actorType,
        actorUserId: doc.actorUserId ? doc.actorUserId.toString() : null,
        actorDisplayName,
        actorRoleSnapshot: doc.actorRoleSnapshot || null,
        targetType: doc.targetType || null,
        targetId: doc.targetId || null,
        targetDisplay: doc.targetDisplay || null,
        outcome: doc.outcome,
        requestId: doc.requestId || null,
        ipAddress: doc.ipAddress || null,
        httpMethod: doc.httpMethod || null,
        route: doc.route || null,
        createdAt: doc.createdAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves single audit log with full detail and verification status.
   */
  async getAuditLogById(auditLogId: string): Promise<AuditLogDetailDTO> {
    if (!Types.ObjectId.isValid(auditLogId)) {
      throw new AppError('Invalid audit log ID.', 400, ErrorCodes.ERR_AUDIT_LOG_NOT_FOUND);
    }

    const doc = await AuditLog.findById(auditLogId).lean();
    if (!doc) {
      throw new AppError('Audit log record not found.', 404, ErrorCodes.ERR_AUDIT_LOG_NOT_FOUND);
    }

    // Resolve actor display name
    let actorDisplayName: string = doc.actorType;
    if (doc.actorUserId) {
      const user = await User.findById(doc.actorUserId).select('firstName lastName email').lean();
      actorDisplayName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        : 'Deleted User';
    }

    // Verify record hash
    const isHashVerified = auditHashService.verifyRecord(doc as any);

    return {
      id: doc._id.toString(),
      eventType: doc.eventType,
      category: doc.category,
      action: doc.action,
      actorType: doc.actorType,
      actorUserId: doc.actorUserId ? doc.actorUserId.toString() : null,
      actorDisplayName,
      actorRoleSnapshot: doc.actorRoleSnapshot || null,
      targetType: doc.targetType || null,
      targetId: doc.targetId || null,
      targetDisplay: doc.targetDisplay || null,
      outcome: doc.outcome,
      failureCode: doc.failureCode || null,
      requestId: doc.requestId || null,
      ipAddress: doc.ipAddress || null,
      userAgent: doc.userAgent || null,
      httpMethod: doc.httpMethod || null,
      route: doc.route || null,
      changedFields: doc.changedFields || null,
      before: doc.before || null,
      after: doc.after || null,
      metadata: doc.metadata || null,
      recordHash: doc.recordHash,
      previousHash: doc.previousHash,
      createdAt: doc.createdAt.toISOString(),
      isHashVerified,
    };
  }

  /**
   * Verifies cryptographic integrity of a specific audit log record.
   */
  async verifyAuditLog(auditLogId: string): Promise<{
    isValid: boolean;
    recordHash: string;
    previousHash: string;
    verifiedAt: string;
  }> {
    if (!Types.ObjectId.isValid(auditLogId)) {
      throw new AppError('Invalid audit log ID.', 400, ErrorCodes.ERR_AUDIT_LOG_NOT_FOUND);
    }

    const doc = await AuditLog.findById(auditLogId).lean();
    if (!doc) {
      throw new AppError('Audit log record not found.', 404, ErrorCodes.ERR_AUDIT_LOG_NOT_FOUND);
    }

    const isValid = auditHashService.verifyRecord(doc as any);

    return {
      isValid,
      recordHash: doc.recordHash,
      previousHash: doc.previousHash,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves records for CSV export (bounded at MAX_EXPORT_ROWS).
   */
  async getExportRecords(query: AuditLogListQuery): Promise<AuditLogListItemDTO[]> {
    const filter = this.buildQueryFilter(query);

    const docs = await AuditLog.find(filter)
      .select('-before -after -metadata')
      .sort({ createdAt: -1 })
      .limit(AUDIT_CONSTANTS.MAX_EXPORT_ROWS + 1)
      .lean();

    if (docs.length > AUDIT_CONSTANTS.MAX_EXPORT_ROWS) {
      throw new AppError(
        `Export exceeds maximum allowed limit of ${AUDIT_CONSTANTS.MAX_EXPORT_ROWS} records. Please narrow your date range or filters.`,
        400,
        ErrorCodes.ERR_AUDIT_EXPORT_TOO_LARGE
      );
    }

    // Batch resolve actor display names
    const actorUserIds = Array.from(
      new Set(
        docs
          .map((d) => d.actorUserId?.toString())
          .filter((id): id is string => Boolean(id))
      )
    );

    const users =
      actorUserIds.length > 0
        ? await User.find({ _id: { $in: actorUserIds.map((id) => new Types.ObjectId(id)) } })
            .select('firstName lastName email')
            .lean()
        : [];

    const userMap = new Map<string, string>();
    for (const u of users) {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
      userMap.set(u._id.toString(), name);
    }

    return docs.map((doc) => {
      let actorDisplayName: string = doc.actorType;
      if (doc.actorUserId) {
        actorDisplayName = userMap.get(doc.actorUserId.toString()) || 'Deleted User';
      }

      return {
        id: doc._id.toString(),
        eventType: doc.eventType,
        category: doc.category,
        action: doc.action,
        actorType: doc.actorType,
        actorUserId: doc.actorUserId ? doc.actorUserId.toString() : null,
        actorDisplayName,
        actorRoleSnapshot: doc.actorRoleSnapshot || null,
        targetType: doc.targetType || null,
        targetId: doc.targetId || null,
        targetDisplay: doc.targetDisplay || null,
        outcome: doc.outcome,
        requestId: doc.requestId || null,
        ipAddress: doc.ipAddress || null,
        httpMethod: doc.httpMethod || null,
        route: doc.route || null,
        createdAt: doc.createdAt.toISOString(),
      };
    });
  }
}

export const auditQueryService = new AuditQueryService();
