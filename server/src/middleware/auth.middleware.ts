import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/auth-token.service.js';
import { User, UserRoleType } from '../modules/users/user.model.js';
import { AppError } from '../shared/errors/app-error.js';
import { ErrorCodes } from '../shared/errors/error-codes.js';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a Bearer token.', 401, ErrorCodes.ERR_UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Authentication token is missing.', 401, ErrorCodes.ERR_UNAUTHORIZED);
    }

    const decoded = verifyAccessToken(token);

    // Verify user exists and is active
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new AppError('The user belonging to this token no longer exists or is disabled.', 401, ErrorCodes.ERR_UNAUTHORIZED);
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt && decoded.iat) {
      const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedTimestamp) {
        throw new AppError('User recently changed password. Please log in again.', 401, ErrorCodes.ERR_TOKEN_EXPIRED);
      }
    }

    // Attach authenticated identity to request
    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorizeRoles = (...allowedRoles: UserRoleType[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Unauthorized: User not authenticated.', 401, ErrorCodes.ERR_UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          'Forbidden: You do not have permission to perform this action.',
          403,
          ErrorCodes.ERR_FORBIDDEN
        )
      );
    }

    next();
  };
};
