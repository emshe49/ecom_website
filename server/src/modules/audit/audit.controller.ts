import { Request, Response, NextFunction } from 'express';
import { auditQueryService } from './audit-query.service.js';
import { auditQuerySchema } from './audit.validation.js';
import { csvExportService, CsvColumn } from '../analytics/csv-export.service.js';
import { AuditLogListItemDTO } from './audit.types.js';

export class AuditController {
  /**
   * GET /api/v1/admin/audit
   * Lists audit logs with pagination and filters.
   */
  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedQuery = auditQuerySchema.parse(req.query);
      const result = await auditQueryService.listAuditLogs(validatedQuery as any);

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/audit/:auditLogId
   * Retrieves detail of single audit log record.
   */
  async getAuditLogById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auditLogId = String(req.params.auditLogId);
      const record = await auditQueryService.getAuditLogById(auditLogId);

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/audit/:auditLogId/verify
   * Cryptographically verifies record hash integrity.
   */
  async verifyAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auditLogId = String(req.params.auditLogId);
      const result = await auditQueryService.verifyAuditLog(auditLogId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/audit/export
   * Streams CSV export of audit logs with formula injection protection.
   */
  async exportAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedQuery = auditQuerySchema.parse(req.query);
      const records = await auditQueryService.getExportRecords(validatedQuery as any);

      const columns: CsvColumn<AuditLogListItemDTO>[] = [
        { header: 'ID', accessor: (r) => r.id },
        { header: 'Date (UTC)', accessor: (r) => r.createdAt },
        { header: 'Event Type', accessor: (r) => r.eventType },
        { header: 'Category', accessor: (r) => r.category },
        { header: 'Action', accessor: (r) => r.action },
        { header: 'Outcome', accessor: (r) => r.outcome },
        { header: 'Actor Type', accessor: (r) => r.actorType },
        { header: 'Actor Name', accessor: (r) => r.actorDisplayName },
        { header: 'Actor Role', accessor: (r) => r.actorRoleSnapshot || '' },
        { header: 'Target Type', accessor: (r) => r.targetType || '' },
        { header: 'Target ID', accessor: (r) => r.targetId || '' },
        { header: 'Target Reference', accessor: (r) => r.targetDisplay || '' },
        { header: 'IP Address', accessor: (r) => r.ipAddress || '' },
        { header: 'Request ID', accessor: (r) => r.requestId || '' },
        { header: 'HTTP Method', accessor: (r) => r.httpMethod || '' },
        { header: 'Route', accessor: (r) => r.route || '' },
      ];

      csvExportService.streamCsvToResponse(res, 'audit_logs', columns, records);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
