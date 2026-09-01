import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/app-error.js';
import { ErrorCodes } from '../shared/errors/error-codes.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(
    new AppError(
      `Cannot ${req.method} ${req.originalUrl} - Route not found`,
      404,
      ErrorCodes.ROUTE_NOT_FOUND
    )
  );
};
