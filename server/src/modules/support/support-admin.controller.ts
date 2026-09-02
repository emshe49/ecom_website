import { Request, Response, NextFunction } from 'express';
import { supportAdminService } from './support-admin.service.js';
import {
  supportQueueQuerySchema,
  staffReplySchema,
  internalNoteSchema,
  assignTicketSchema,
  updatePrioritySchema,
  updateStatusSchema,
  resolveTicketSchema,
} from './support.validation.js';

export const supportAdminController = {
  /**
   * GET /api/v1/admin/support/tickets
   */
  async getSupportQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const query = supportQueueQuerySchema.parse(req.query);
      const result = await supportAdminService.getSupportQueue(query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/support/tickets/:ticketId
   */
  async getTicketDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await supportAdminService.getTicketDetails(String(req.params.ticketId));
      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/messages
   */
  async replyToTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = staffReplySchema.parse(req.body);
      const message = await supportAdminService.replyToTicket(
        req.user!.id,
        String(req.params.ticketId),
        validated.message
      );
      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/internal-notes
   */
  async addInternalNote(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = internalNoteSchema.parse(req.body);
      const message = await supportAdminService.addInternalNote(
        req.user!.id,
        String(req.params.ticketId),
        validated.message
      );
      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/assign
   */
  async assignTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = assignTicketSchema.parse(req.body);
      const result = await supportAdminService.assignTicket(
        req.user!.id,
        String(req.params.ticketId),
        validated.staffUserId
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/assign-to-me
   */
  async assignToMe(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supportAdminService.assignToMe(
        req.user!.id,
        String(req.params.ticketId)
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/admin/support/tickets/:ticketId/priority
   */
  async updatePriority(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updatePrioritySchema.parse(req.body);
      const result = await supportAdminService.updatePriority(
        req.user!.id,
        String(req.params.ticketId),
        validated.priority
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/admin/support/tickets/:ticketId/status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateStatusSchema.parse(req.body);
      const result = await supportAdminService.updateStatus(
        req.user!.id,
        String(req.params.ticketId),
        validated.status
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/resolve
   */
  async resolveTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = resolveTicketSchema.parse(req.body);
      const result = await supportAdminService.resolveTicket(
        req.user!.id,
        String(req.params.ticketId),
        validated.resolutionSummary
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/close
   */
  async closeTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supportAdminService.closeTicket(
        req.user!.id,
        String(req.params.ticketId)
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/support/tickets/:ticketId/read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supportAdminService.markAsRead(
        req.user!.id,
        String(req.params.ticketId)
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
