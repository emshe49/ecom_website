import { Request, Response } from 'express';
import { emailPreferenceService } from './email-preference.service.js';
import { updateEmailPreferenceSchema } from './email.validation.js';

export const emailController = {
  async getMyPreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const pref = await emailPreferenceService.getPreferences(userId);
      res.json({ success: true, data: pref });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateMyPreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const updates = updateEmailPreferenceSchema.parse(req.body);
      const pref = await emailPreferenceService.updatePreferences(userId, updates);
      res.json({ success: true, data: pref });
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ success: false, message: 'Validation failed', errors: err.errors });
      } else {
        res.status(500).json({ success: false, message: err.message });
      }
    }
  }
};
