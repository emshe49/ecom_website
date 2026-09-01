import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/app-error.js';
import { ErrorCodes } from '../shared/errors/error-codes.js';
import { sendError } from '../shared/utils/response.js';
import { logger } from '../shared/utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let code: string = ErrorCodes.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected internal server error occurred';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ZodError' || (err as any).issues) {
    // Zod schema validation error
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Request validation failed';
    details = (err as any).errors || (err as any).issues;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = err.message;
  } else if (err.name === 'CastError') {
    // Mongoose invalid ObjectId
    statusCode = 400;
    code = ErrorCodes.BAD_REQUEST;
    message = 'Invalid resource identifier format';
  } else if ((err as unknown as { code?: number }).code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    code = ErrorCodes.CONFLICT;
    message = 'A resource with this identifier already exists';
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON payload
    statusCode = 400;
    code = ErrorCodes.BAD_REQUEST;
    message = 'Malformed JSON in request payload';
  }


  // Log error
  if (statusCode >= 500) {
    logger.error(`Unhandled Error [${req.method} ${req.originalUrl}]: ${err.message}`, 'ErrorHandler', {
      stack: err.stack,
    });
  } else {
    logger.warn(`Operational Error [${req.method} ${req.originalUrl}]: ${message}`, 'ErrorHandler');
  }

  // In production, hide stack traces and generic internal server errors
  const stack = env.NODE_ENV === 'development' ? err.stack : undefined;

  sendError(res, statusCode, code, message, details, stack);
};
