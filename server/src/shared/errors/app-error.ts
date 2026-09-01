import { ErrorCode, ErrorCodes } from './error-codes.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code: ErrorCode = ErrorCodes.BAD_REQUEST, details?: unknown): AppError {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message: string = 'Unauthorized', code: ErrorCode = ErrorCodes.UNAUTHORIZED, details?: unknown): AppError {
    return new AppError(message, 401, code, details);
  }

  static forbidden(message: string = 'Forbidden', code: ErrorCode = ErrorCodes.FORBIDDEN, details?: unknown): AppError {
    return new AppError(message, 403, code, details);
  }

  static notFound(message: string = 'Resource not found', code: ErrorCode = ErrorCodes.NOT_FOUND, details?: unknown): AppError {
    return new AppError(message, 404, code, details);
  }

  static conflict(message: string, code: ErrorCode = ErrorCodes.CONFLICT, details?: unknown): AppError {
    return new AppError(message, 409, code, details);
  }

  static validation(message: string = 'Validation failed', details?: unknown): AppError {
    return new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }

  static gone(message: string, code: ErrorCode = ErrorCodes.GONE, details?: unknown): AppError {
    return new AppError(message, 410, code, details);
  }

  static create(statusCode: number, message: string, code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR, details?: unknown): AppError {
    return new AppError(message, statusCode, code, details);
  }

  static internal(message: string = 'An unexpected internal error occurred', details?: unknown): AppError {
    return new AppError(message, 500, ErrorCodes.INTERNAL_SERVER_ERROR, details);
  }
}

