import { Response } from 'express';
import { ApiErrorResponse, ApiSuccessResponse } from '../types/response.types.js';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: Record<string, unknown>
): Response<ApiSuccessResponse<T>> => {
  const responsePayload: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(responsePayload);
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
  stack?: string
): Response<ApiErrorResponse> => {
  const responsePayload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(stack ? { stack } : {}),
    },
  };
  return res.status(statusCode).json(responsePayload);
};
