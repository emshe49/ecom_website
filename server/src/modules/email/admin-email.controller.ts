import { Request, Response } from 'express';
import { emailQueryService } from './email-query.service.js';
import { emailService } from './email.service.js';
import { adminEmailQuerySchema } from './email.validation.js';

export const adminEmailController = {
  async listEmails(req: Request, res: Response) {
    try {
      const filters = adminEmailQuerySchema.parse(req.query);
      const result = await emailQueryService.listEmails(filters);
      res.json({ success: true, ...result });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, message: 'Invalid query parameters', errors: err.errors });
      } else {
        res.status(500).json({ success: false, message: err.message });
      }
    }
  },

  async getEmailDetails(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const details = await emailQueryService.getEmailDetails(id);
      if (!details) {
        res.status(404).json({ success: false, message: 'Email not found' });
        return;
      }
      res.json({ success: true, data: details });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async retryEmail(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await emailService.retryEmail(id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      const status = [
        'ERR_EMAIL_NOT_FOUND',
        'ERR_EMAIL_ALREADY_SENT',
        'ERR_EMAIL_MAX_ATTEMPTS_REACHED'
      ].includes(err.code) ? 400 : 500;
      
      res.status(status).json({ success: false, message: err.message, code: err.code });
    }
  }
};
