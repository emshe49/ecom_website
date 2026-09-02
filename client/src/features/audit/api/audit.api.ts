import { api } from '../../../services/api';
import {
  AuditFilterParams,
  AuditLogListResponse,
  AuditLogDetail,
  AuditVerificationResult,
} from '../types/audit.types';

export const auditApi = {
  /**
   * List audit logs with pagination and filters
   */
  async listAuditLogs(params: AuditFilterParams): Promise<AuditLogListResponse> {
    const cleanedParams: Record<string, any> = {};
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== '' && val !== null) {
        cleanedParams[key] = val;
      }
    }

    const res = await api.get('/admin/audit', { params: cleanedParams });
    return {
      items: res.data.data,
      total: res.data.meta.total,
      page: res.data.meta.page,
      limit: res.data.meta.limit,
      totalPages: res.data.meta.totalPages,
    };
  },

  /**
   * Get single audit record detail
   */
  async getAuditLogById(auditLogId: string): Promise<AuditLogDetail> {
    const res = await api.get(`/admin/audit/${auditLogId}`);
    return res.data.data;
  },

  /**
   * Cryptographically verify single audit record integrity
   */
  async verifyAuditLog(auditLogId: string): Promise<AuditVerificationResult> {
    const res = await api.get(`/admin/audit/${auditLogId}/verify`);
    return res.data.data;
  },

  /**
   * Download CSV export
   */
  async exportAuditLogs(params: AuditFilterParams): Promise<void> {
    const cleanedParams: Record<string, any> = {};
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== '' && val !== null && key !== 'page' && key !== 'limit') {
        cleanedParams[key] = val;
      }
    }

    const res = await api.get('/admin/audit/export', {
      params: cleanedParams,
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `audit_logs_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
