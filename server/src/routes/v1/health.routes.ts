import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../shared/utils/response.js';
import { env } from '../../config/env.js';
import { getDBStatus } from '../../database/mongoose.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const healthData = {
    status: 'ok',
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: getDBStatus(),
  };

  sendSuccess(res, healthData);
});

export const healthRouter = router;
