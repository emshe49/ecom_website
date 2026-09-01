import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service.js';

export const paymentWebhookController = {
  /**
   * POST /api/v1/webhooks/payments/:provider
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const provider = req.params.provider as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const result = await paymentService.processWebhook(
        provider,
        rawBody,
        req.headers,
        req.body
      );

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
