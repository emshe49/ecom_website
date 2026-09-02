import crypto from 'crypto';
import { IAuditLog } from './audit.types.js';

export class AuditHashService {
  /**
   * Recursively normalizes an object to produce deterministic, canonical JSON.
   * Dictionary keys are sorted alphabetically.
   */
  canonicalize(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (value instanceof Date) {
      return JSON.stringify(value.toISOString());
    }

    if (Array.isArray(value)) {
      return '[' + value.map((item) => this.canonicalize(item)).join(',') + ']';
    }

    // Sort keys alphabetically
    const keys = Object.keys(value).sort();
    const entries = keys.map(
      (key) => `${JSON.stringify(key)}:${this.canonicalize(value[key])}`
    );

    return '{' + entries.join(',') + '}';
  }

  /**
   * Extracts the canonical subset of immutable fields from an AuditLog record.
   * Notice: 'recordHash' is strictly excluded from its own canonical digest.
   */
  getCanonicalData(record: Partial<IAuditLog>): string {
    const canonicalPayload = {
      eventType: record.eventType ?? '',
      category: record.category ?? '',
      action: record.action ?? '',
      actorType: record.actorType ?? '',
      actorUserId: record.actorUserId ? String(record.actorUserId) : null,
      actorRoleSnapshot: record.actorRoleSnapshot ?? null,
      targetType: record.targetType ?? null,
      targetId: record.targetId ?? null,
      targetDisplay: record.targetDisplay ?? null,
      outcome: record.outcome ?? '',
      failureCode: record.failureCode ?? null,
      requestId: record.requestId ?? null,
      ipAddress: record.ipAddress ?? null,
      userAgent: record.userAgent ?? null,
      httpMethod: record.httpMethod ?? null,
      route: record.route ?? null,
      changedFields: record.changedFields ?? null,
      before: record.before ?? null,
      after: record.after ?? null,
      metadata: record.metadata ?? null,
      createdAt:
        record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : record.createdAt ?? '',
    };

    return this.canonicalize(canonicalPayload);
  }

  /**
   * Computes SHA-256 record hash from previousHash and canonical data.
   */
  computeHash(previousHash: string, canonicalData: string): string {
    return crypto
      .createHash('sha256')
      .update(`${previousHash}:${canonicalData}`)
      .digest('hex');
  }

  /**
   * Cryptographically verifies an audit log record against its previousHash.
   */
  verifyRecord(record: IAuditLog): boolean {
    if (!record.recordHash || !record.previousHash) {
      return false;
    }

    const canonicalData = this.getCanonicalData(record);
    const expectedHash = this.computeHash(record.previousHash, canonicalData);

    return expectedHash === record.recordHash;
  }
}

export const auditHashService = new AuditHashService();
