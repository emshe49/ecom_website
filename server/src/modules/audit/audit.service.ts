import { Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit.model.js';
import { AuditChainState } from './audit-chain-state.model.js';
import { RecordAuditEventInput } from './audit.types.js';
import { AUDIT_CONSTANTS, ACTOR_TYPE } from './audit.constants.js';
import { auditRedactionService } from './audit-redaction.service.js';
import { auditHashService } from './audit-hash.service.js';
import { logger } from '../../shared/utils/logger.js';

export class AuditService {
  /**
   * Records an immutable, tamper-evident audit event.
   * Isolates audit errors so failures never disrupt primary business logic.
   */
  async recordAuditEvent(input: RecordAuditEventInput): Promise<AuditLogDocument | null> {
    // Guard against null/undefined input to maintain non-blocking isolation
    if (!input || typeof input !== 'object') {
      logger.warn('recordAuditEvent called with null or invalid input — skipping.', 'AuditService');
      return null;
    }
    try {
      // 1. Resolve Actor Identity
      let actorType = input.actor?.actorType || input.requestContext?.actorType || ACTOR_TYPE.SYSTEM;
      let actorUserId: Types.ObjectId | null = null;

      const rawUserId = input.actor?.actorUserId || input.requestContext?.actorUserId;
      if (rawUserId && Types.ObjectId.isValid(String(rawUserId))) {
        actorUserId = new Types.ObjectId(String(rawUserId));
      }

      const actorRoleSnapshot =
        input.actor?.actorRoleSnapshot || input.requestContext?.actorRoleSnapshot || null;

      // 2. Extract Request Metadata
      const requestId = input.requestContext?.requestId || null;
      const ipAddress = input.requestContext?.ipAddress || null;
      const userAgent = auditRedactionService.sanitizeUserAgent(input.requestContext?.userAgent);
      const httpMethod = input.requestContext?.httpMethod || null;
      const route = auditRedactionService.normalizeRoute(input.requestContext?.route);

      // 3. Sanitize and bound before/after/metadata
      const targetType = input.target?.targetType || null;
      const before = auditRedactionService.filterSnapshot(input.before, targetType || undefined);
      const after = auditRedactionService.filterSnapshot(input.after, targetType || undefined);
      const metadata = auditRedactionService.boundMetadata(input.metadata);

      // 4. Resolve Action display
      const action = input.action || input.eventType.split('.').pop()?.toUpperCase() || 'ACTION';

      // 5. Tamper-Evident Hash Chain: Atomically acquire previousHash & advance chain state
      let chainState = await AuditChainState.findOne({ chainId: 'global_chain' });
      if (!chainState) {
        chainState = await AuditChainState.create({
          chainId: 'global_chain',
          latestHash: AUDIT_CONSTANTS.GENESIS_HASH,
          sequenceNumber: 0,
        });
      }

      const previousHash = chainState.latestHash;

      // Build intermediate payload for canonical hashing
      const createdAt = new Date();
      const rawPayload = {
        eventType: input.eventType,
        category: input.category,
        action,
        actorType,
        actorUserId,
        actorRoleSnapshot,
        targetType,
        targetId: input.target?.targetId || null,
        targetDisplay: input.target?.targetDisplay || null,
        outcome: input.outcome,
        failureCode: input.failureCode || null,
        requestId,
        ipAddress,
        userAgent,
        httpMethod,
        route,
        changedFields: input.changedFields || null,
        before,
        after,
        metadata,
        createdAt,
      };

      const canonicalData = auditHashService.getCanonicalData(rawPayload);
      const recordHash = auditHashService.computeHash(previousHash, canonicalData);

      // 6. Create immutable AuditLog record
      const auditLog = await AuditLog.create({
        ...rawPayload,
        recordHash,
        previousHash,
      });

      // 7. Update chain latestHash
      await AuditChainState.findOneAndUpdate(
        { chainId: 'global_chain' },
        {
          $set: {
            latestHash: recordHash,
            updatedAt: new Date(),
          },
          $inc: { sequenceNumber: 1 },
        }
      );

      return auditLog;
    } catch (err: any) {
      // AUDIT-SEC-08: Log failure without rethrowing so business transactions are preserved
      logger.error(
        `Failed to record audit event: ${err.message}`,
        'AuditService',
        {
          eventType: input.eventType,
          category: input.category,
          targetId: input.target?.targetId,
          requestId: input.requestContext?.requestId,
        }
      );
      return null;
    }
  }
}

export const auditService = new AuditService();
