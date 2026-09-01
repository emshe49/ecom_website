import { Request, Response, NextFunction } from 'express';
import { Permission } from './permissions.js';
import { Role } from './roles.js';
import { authorizationService } from './authorization.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export const requirePermission = (permission: Permission) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError('Unauthorized: Authentication required.', 401, ErrorCodes.ERR_UNAUTHORIZED)
      );
    }

    const hasAccess = authorizationService.hasPermission(req.user.role as Role, permission);
    if (!hasAccess) {
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
