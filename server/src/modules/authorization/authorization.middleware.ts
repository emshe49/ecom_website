import { Request, Response, NextFunction } from 'express';
import { Permission } from './permissions.js';
import { Role } from './roles.js';
import { authorizationService } from './authorization.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { auditService } from '../audit/audit.service.js';
import {
  AUDIT_EVENT_TYPE,
  AUDIT_CATEGORY,
  ACTOR_TYPE,
  AUDIT_OUTCOME,
  TARGET_TYPE,
} from '../audit/audit.constants.js';
import { buildAuditContext } from '../audit/audit-context.js';

export const requirePermission = (permission: Permission) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError('Unauthorized: Authentication required.', 401, ErrorCodes.ERR_UNAUTHORIZED)
      );
    }

    const hasAccess = authorizationService.hasPermission(req.user.role as Role, permission);
    if (!hasAccess) {
      auditService.recordAuditEvent({
        eventType: AUDIT_EVENT_TYPE.SECURITY_PERMISSION_DENIED,
        category: AUDIT_CATEGORY.SECURITY,
        action: 'PERMISSION_DENIED',
        actor: {
          actorType:
            req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN'
              ? ACTOR_TYPE.ADMIN
              : ACTOR_TYPE.USER,
          actorUserId: req.user.id,
          actorRoleSnapshot: req.user.role,
        },
        target: {
          targetType: TARGET_TYPE.SECURITY,
          targetDisplay: permission,
        },
        outcome: AUDIT_OUTCOME.DENIED,
        failureCode: ErrorCodes.ERR_PERMISSION_REQUIRED,
        metadata: {
          requiredPermission: permission,
        },
        requestContext: buildAuditContext(req),
      }).catch(() => {});

      return next(
        new AppError(
          `Forbidden: You do not have the required permission '${permission}' to perform this action.`,
          403,
          ErrorCodes.ERR_PERMISSION_REQUIRED
        )
      );
    }

    next();
  };
};

export const requireAnyPermission = (...permissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError('Unauthorized: Authentication required.', 401, ErrorCodes.ERR_UNAUTHORIZED)
      );
    }

    const hasAccess = authorizationService.hasAnyPermission(req.user.role as Role, permissions);
    if (!hasAccess) {
      return next(
        new AppError(
          `Forbidden: You require at least one of the following permissions: ${permissions.join(', ')}.`,
          403,
          ErrorCodes.ERR_PERMISSION_REQUIRED
        )
      );
    }

    next();
  };
};

export const requireAllPermissions = (...permissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError('Unauthorized: Authentication required.', 401, ErrorCodes.ERR_UNAUTHORIZED)
      );
    }

    const hasAccess = authorizationService.hasAllPermissions(req.user.role as Role, permissions);
    if (!hasAccess) {
      return next(
        new AppError(
          `Forbidden: You require all of the following permissions: ${permissions.join(', ')}.`,
          403,
          ErrorCodes.ERR_PERMISSION_REQUIRED
        )
      );
    }

    next();
  };
};
