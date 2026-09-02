import { Request, Response, NextFunction } from 'express';
import { supportService } from './support.service.js';
import {
  createCustomerTicketSchema,
  customerReplySchema,
  customerTicketListQuerySchema,
} from './support.validation.js';

export const supportController = {
  /**
   * POST /api/v1/support/tickets
   */
  async createTicket(req: Request, res: Response, Next: NextFunction) {
    try {
      const validated = createCustomerTicketSchema.parse(req.body);
      const ticket = await supportService.createTicket(req.user!.id, validated);
      res.status(201).json({
        success: true,
        data: ticket,
      });
    } catch (err) {
      Next(err);
    }
  },

  /**
   * GET /api/v1/support/tickets
   */
  async getTickets(req: Request, res: Response, Next: NextFunction) {
    try {
      const query = customerTicketListQuerySchema.parse(req.query);
      const result = await supportService.getCustomerTickets(req.user!.id, query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      Next(err);
    }
  },

  /**
   * GET /api/v1/support/tickets/:ticketId
   */
  async getTicketDetails(req: Request, res: Response, Next: NextFunction) {
    try {
      const ticket = await supportService.getTicketDetails(req.user!.id, String(req.params.ticketId));
      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (err) {
      Next(err);
    }
  },

  /**
   * POST /api/v1/support/tickets/:ticketId/messages
   */
  async replyToTicket(req: Request, res: Response, Next: NextFunction) {
    try {
      const validated = customerReplySchema.parse(req.body);
      const message = await supportService.replyToTicket(
        req.user!.id,
        String(req.params.ticketId),
        validated.message
      );
      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (err) {
      Next(err);
    }
  },

  /**
   * POST /api/v1/support/tickets/:ticketId/read
   */
  async markAsRead(req: Request, res: Response, Next: NextFunction) {
    try {
      const result = await supportService.markAsRead(req.user!.id, String(req.params.ticketId));
      res.status(200).json(result);
    } catch (err) {
      Next(err);
    }
  },

  /**
   * POST /api/v1/support/tickets/:ticketId/reopen
   */
  async reopenTicket(req: Request, res: Response, Next: NextFunction) {
    try {
      const result = await supportService.reopenTicket(req.user!.id, String(req.params.ticketId));
      res.status(200).json(result);
    } catch (err) {
      Next(err);
    }
  },

  /**
   * POST /api/v1/support/tickets/:ticketId/close
   */
  async closeTicket(req: Request, res: Response, Next: NextFunction) {
    try {
      const result = await supportService.closeTicket(req.user!.id, String(req.params.ticketId));
      res.status(200).json(result);
    } catch (err) {
      Next(err);
    }
  },
};
