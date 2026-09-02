import { Request } from 'express';
import { AuditContext } from './audit.types.js';
import { ACTOR_TYPE } from './audit.constants.js';
import { auditRedactionService } from './audit-redaction.service.js';

export const buildAuditContext = (req: Request): AuditContext => {
  const user = req.user;
  let actorType: (typeof ACTOR_TYPE)[keyof typeof ACTOR_TYPE] = ACTOR_TYPE.SYSTEM;

  if (user) {
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      actorType = ACTOR_TYPE.ADMIN;
    } else {
      actorType = ACTOR_TYPE.USER;
    }
  }

  // Extract client IP safely
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    null;

  // Normalized route path (ignoring query strings)
  const normalizedRoute = auditRedactionService.normalizeRoute(
    req.baseUrl ? `${req.baseUrl}${req.route?.path || req.path || ''}` : req.originalUrl
  );

  return {
    actorUserId: user?.id || null,
    actorRoleSnapshot: user?.role || null,
    actorType,
    requestId: req.requestId || null,
    ipAddress: ip,
    userAgent: auditRedactionService.sanitizeUserAgent(req.headers['user-agent']),
    httpMethod: req.method || null,
    route: normalizedRoute,
  };
};
