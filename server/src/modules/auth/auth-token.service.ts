import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { UserRoleType } from '../users/user.model.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export interface AccessTokenPayload {
  sub: string;
  role: UserRoleType;
  email: string;
  iat?: number;
  exp?: number;
}

export const parseDurationToMs = (durationStr: string): number => {
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 15 * 60 * 1000; // default 15 minutes
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
};

export const generateAccessToken = (payload: { sub: string; role: UserRoleType; email: string }): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Access token has expired', 401, ErrorCodes.ERR_TOKEN_EXPIRED);
    }
    throw new AppError('Invalid access token', 401, ErrorCodes.ERR_TOKEN_INVALID);
  }
};

export const generateRefreshTokenString = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

export const getRefreshTokenExpiryDate = (): Date => {
  const ms = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
  return new Date(Date.now() + ms);
};
