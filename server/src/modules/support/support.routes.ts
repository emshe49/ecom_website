import { Router } from 'express';
import { supportController } from './support.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export const supportRouter = Router();

// All customer support routes require authentication
supportRouter.use(authenticate);

supportRouter.post('/', supportController.createTicket);
supportRouter.get('/', supportController.getTickets);
supportRouter.get('/:ticketId', supportController.getTicketDetails);
supportRouter.post('/:ticketId/messages', supportController.replyToTicket);
supportRouter.post('/:ticketId/read', supportController.markAsRead);
supportRouter.post('/:ticketId/reopen', supportController.reopenTicket);
supportRouter.post('/:ticketId/close', supportController.closeTicket);
