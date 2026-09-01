import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    // Log request completion
    const logData: Record<string, unknown> = {
      method,
      url: originalUrl,
      status: statusCode,
      duration: `${duration}ms`,
      ip: ip || req.socket.remoteAddress,
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${method} ${originalUrl} ${statusCode} [${duration}ms]`, 'HTTP', logData);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${method} ${originalUrl} ${statusCode} [${duration}ms]`, 'HTTP', logData);
    } else {
      logger.info(`HTTP ${method} ${originalUrl} ${statusCode} [${duration}ms]`, 'HTTP', logData);
    }
  });

  next();
};
