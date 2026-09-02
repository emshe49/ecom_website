import { Request, Response, NextFunction, CookieOptions } from 'express';
import crypto from 'crypto';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { env } from '../../config/env.js';
import { parseDurationToMs } from './auth-token.service.js';
import { auditService } from '../audit/audit.service.js';
import {
  AUDIT_EVENT_TYPE,
  AUDIT_CATEGORY,
  ACTOR_TYPE,
  AUDIT_OUTCOME,
  TARGET_TYPE,
} from '../audit/audit.constants.js';
import { buildAuditContext } from '../audit/audit-context.js';
import { AppError } from '../../shared/errors/app-error.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const getRefreshCookieOptions = (): CookieOptions => {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
    path: '/api/v1/auth',
  };
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      const result = await authService.login(req.body, metadata);

      // Audit successful login
      auditService.recordAuditEvent({
        eventType: AUDIT_EVENT_TYPE.AUTH_LOGIN_SUCCESS,
        category: AUDIT_CATEGORY.AUTH,
        action: 'LOGIN_SUCCESS',
        actor: {
          actorType:
            result.user.role === 'SUPER_ADMIN' || result.user.role === 'ADMIN'
              ? ACTOR_TYPE.ADMIN
              : ACTOR_TYPE.USER,
          actorUserId: result.user.id,
          actorRoleSnapshot: result.user.role,
        },
        target: {
          targetType: TARGET_TYPE.USER,
          targetId: result.user.id,
          targetDisplay: result.user.email,
        },
        outcome: AUDIT_OUTCOME.SUCCESS,
        requestContext: buildAuditContext(req),
      }).catch(() => {});

      // Set HttpOnly refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getRefreshCookieOptions());

      sendSuccess(res, {
        user: result.user,
        accessToken: result.tokens.accessToken,
      });
    } catch (error) {
      // Audit failed login attempt (preserving confidentiality using hashed identifier)
      const emailAttempt = String(req.body?.email || '').trim().toLowerCase();
      const identifierHash = emailAttempt
        ? crypto.createHash('sha256').update(emailAttempt).digest('hex')
        : 'unknown';

      auditService.recordAuditEvent({
        eventType: AUDIT_EVENT_TYPE.AUTH_LOGIN_FAILED,
        category: AUDIT_CATEGORY.AUTH,
        action: 'LOGIN_FAILED',
        actor: {
          actorType: ACTOR_TYPE.USER,
          actorUserId: null,
        },
        target: {
          targetType: TARGET_TYPE.USER,
          targetDisplay: 'Account attempt',
        },
        outcome: AUDIT_OUTCOME.FAILURE,
        failureCode: error instanceof AppError ? error.code : 'ERR_INVALID_CREDENTIALS',
        metadata: {
          identifierHash,
        },
        requestContext: buildAuditContext(req),
      }).catch(() => {});

      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
      const metadata = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };

      const result = await authService.refresh(rawRefreshToken, metadata);

      // Replace with rotated HttpOnly refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getRefreshCookieOptions());

      sendSuccess(res, {
        user: result.user,
        accessToken: result.tokens.accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
      await authService.logout(rawRefreshToken);

      if (req.user) {
        auditService.recordAuditEvent({
          eventType: AUDIT_EVENT_TYPE.AUTH_LOGOUT,
          category: AUDIT_CATEGORY.AUTH,
          action: 'LOGOUT',
          actor: {
            actorType:
              req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN'
                ? ACTOR_TYPE.ADMIN
                : ACTOR_TYPE.USER,
            actorUserId: req.user.id,
            actorRoleSnapshot: req.user.role,
          },
          target: {
            targetType: TARGET_TYPE.USER,
            targetId: req.user.id,
            targetDisplay: req.user.email,
          },
          outcome: AUDIT_OUTCOME.SUCCESS,
          requestContext: buildAuditContext(req),
        }).catch(() => {});
      }

      // Clear refresh cookie
      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/api/v1/auth',
      });

      sendSuccess(res, { message: 'Logged out successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logoutAll(req.user.id);
      }

      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/api/v1/auth',
      });

      sendSuccess(res, { message: 'Successfully logged out from all devices.' });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyEmail(req.body.token);

      auditService.recordAuditEvent({
        eventType: AUDIT_EVENT_TYPE.AUTH_EMAIL_VERIFIED,
        category: AUDIT_CATEGORY.AUTH,
        action: 'EMAIL_VERIFIED',
        actor: {
          actorType: ACTOR_TYPE.USER,
          actorUserId: null,
        },
        target: {
          targetType: TARGET_TYPE.USER,
          targetDisplay: 'Verified Email',
        },
        outcome: AUDIT_OUTCOME.SUCCESS,
        requestContext: buildAuditContext(req),
      }).catch(() => {});

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resendVerification(req.body.email);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.forgotPassword(req.body.email);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.resetPassword(req.body);

      // Clear any existing refresh cookie upon password reset
      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/api/v1/auth',
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.changePassword(req.user!.id, req.body);

      auditService.recordAuditEvent({
        eventType: AUDIT_EVENT_TYPE.AUTH_PASSWORD_CHANGED,
        category: AUDIT_CATEGORY.AUTH,
        action: 'PASSWORD_CHANGED',
        actor: {
          actorType:
            req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN'
              ? ACTOR_TYPE.ADMIN
              : ACTOR_TYPE.USER,
          actorUserId: req.user?.id,
          actorRoleSnapshot: req.user?.role,
        },
        target: {
          targetType: TARGET_TYPE.USER,
          targetId: req.user?.id,
          targetDisplay: req.user?.email,
        },
        outcome: AUDIT_OUTCOME.SUCCESS,
        requestContext: buildAuditContext(req),
      }).catch(() => {});

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.id);
      sendSuccess(res, { user }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.user!.role as import('../authorization/roles.js').Role;
      const { authorizationService } = await import('../authorization/authorization.service.js');
      const permissions = authorizationService.getPermissionsForRole(role);
      sendSuccess(res, { role, permissions }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
