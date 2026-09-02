import { notificationService } from '../notifications/notification.service.js';
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
} from '../notifications/notification.constants.js';
import { emailService } from '../email/email.service.js';
import { logger } from '../../shared/utils/logger.js';
import { ISupportTicket } from './support.types.js';
import { User } from '../users/user.model.js';
import { ROLES } from '../authorization/roles.js';

export class SupportNotificationService {
  /**
   * Notifies customer and staff when a new support ticket is created.
   */
  async notifyTicketCreated(
    ticket: ISupportTicket,
    customer: { id: string; email: string; firstName?: string }
  ): Promise<void> {
    // 1. In-app notification for customer
    try {
      await notificationService.createNotification({
        userId: customer.id,
        type: NOTIFICATION_TYPE.SUPPORT_TICKET_CREATED,
        category: NOTIFICATION_CATEGORY.SUPPORT,
        title: 'Support Ticket Created',
        message: `Your ticket ${ticket.ticketNumber} (${ticket.subject}) has been received.`,
        actionUrl: `/support/${ticket._id.toString()}`,
        metadata: {
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
          category: ticket.category,
        },
      });
    } catch (err: any) {
      logger.warn(`Failed to create ticket created notification: ${err.message}`);
    }

    // 2. Email confirmation to customer
    try {
      await emailService.sendTransactionalEmail({
        userId: customer.id,
        recipient: customer.email,
        templateId: 'SUPPORT_TICKET_CREATED',
        data: {
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          category: ticket.category,
        },
      });
    } catch (err: any) {
      logger.warn(`Failed to send ticket created email: ${err.message}`);
    }
  }

  /**
   * Notifies customer when staff sends a visible reply (NOT for internal notes!).
   */
  async notifyStaffReply(
    ticket: ISupportTicket,
    replyText: string,
    customer: { id: string; email: string }
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        userId: customer.id,
        type: NOTIFICATION_TYPE.SUPPORT_TICKET_REPLY,
        category: NOTIFICATION_CATEGORY.SUPPORT,
        title: 'New Reply on Support Ticket',
        message: `Support team replied to ticket ${ticket.ticketNumber}.`,
        actionUrl: `/support/${ticket._id.toString()}`,
        metadata: {
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
        },
      });
    } catch (err: any) {
      logger.warn(`Failed to create staff reply notification: ${err.message}`);
    }

    try {
      await emailService.sendTransactionalEmail({
        userId: customer.id,
        recipient: customer.email,
        templateId: 'SUPPORT_STAFF_REPLY',
        data: {
          ticketNumber: ticket.ticketNumber,
          reply: replyText.slice(0, 300),
        },
      });
    } catch (err: any) {
      logger.warn(`Failed to send staff reply email: ${err.message}`);
    }
  }

  /**
   * Notifies assigned staff (or all staff if unassigned) when customer replies.
   */
  async notifyCustomerReply(ticket: ISupportTicket): Promise<void> {
    try {
      const recipientId = ticket.assignedTo
        ? ticket.assignedTo.toString()
        : await this.getFirstAdminId();

      if (recipientId) {
        await notificationService.createNotification({
          userId: recipientId,
          type: NOTIFICATION_TYPE.SUPPORT_TICKET_REPLY,
          category: NOTIFICATION_CATEGORY.SUPPORT,
          title: 'Customer Replied to Ticket',
          message: `Customer replied to ticket ${ticket.ticketNumber}.`,
          actionUrl: `/admin/support/${ticket._id.toString()}`,
          metadata: {
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
          },
        });
      }
    } catch (err: any) {
      logger.warn(`Failed to notify customer reply: ${err.message}`);
    }
  }

  /**
   * Notifies staff when ticket is assigned to them.
   */
  async notifyTicketAssigned(
    ticket: ISupportTicket,
    staffUserId: string
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        userId: staffUserId,
        type: NOTIFICATION_TYPE.SUPPORT_TICKET_ASSIGNED,
        category: NOTIFICATION_CATEGORY.SUPPORT,
        title: 'Support Ticket Assigned',
        message: `Ticket ${ticket.ticketNumber} has been assigned to you.`,
        actionUrl: `/admin/support/${ticket._id.toString()}`,
        metadata: {
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
        },
      });
    } catch (err: any) {
      logger.warn(`Failed to notify ticket assignment: ${err.message}`);
    }
  }

  /**
   * Notifies customer when ticket is resolved.
   */
  async notifyTicketResolved(
    ticket: ISupportTicket,
    resolutionSummary: string,
    customer: { id: string; email: string }
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        userId: customer.id,
        type: NOTIFICATION_TYPE.SUPPORT_TICKET_RESOLVED,
        category: NOTIFICATION_CATEGORY.SUPPORT,
        title: 'Support Ticket Resolved',
        message: `Ticket ${ticket.ticketNumber} has been marked resolved.`,
        actionUrl: `/support/${ticket._id.toString()}`,
        metadata: {
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
          resolutionSummary,
        },
      });
    } catch (err: any) {
      logger.warn(`Failed to notify ticket resolved: ${err.message}`);
    }

    try {
      await emailService.sendTransactionalEmail({
        userId: customer.id,
        recipient: customer.email,
        templateId: 'SUPPORT_TICKET_RESOLVED',
        data: {
          ticketNumber: ticket.ticketNumber,
          resolutionSummary,
        },
      });
    } catch (err: any) {
      logger.warn(`Failed to send ticket resolved email: ${err.message}`);
    }
  }

  /**
   * Notifies staff when a ticket is reopened.
   */
  async notifyTicketReopened(ticket: ISupportTicket): Promise<void> {
    try {
      const recipientId = ticket.assignedTo
        ? ticket.assignedTo.toString()
        : await this.getFirstAdminId();

      if (recipientId) {
        await notificationService.createNotification({
          userId: recipientId,
          type: NOTIFICATION_TYPE.SUPPORT_TICKET_REOPENED,
          category: NOTIFICATION_CATEGORY.SUPPORT,
          title: 'Ticket Reopened by Customer',
          message: `Ticket ${ticket.ticketNumber} was reopened and needs attention.`,
          actionUrl: `/admin/support/${ticket._id.toString()}`,
          metadata: {
            ticketId: ticket._id.toString(),
            ticketNumber: ticket.ticketNumber,
          },
        });
      }
    } catch (err: any) {
      logger.warn(`Failed to notify ticket reopened: ${err.message}`);
    }
  }

  private async getFirstAdminId(): Promise<string | null> {
    const admin = await User.findOne({
      role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CUSTOMER_SUPPORT] },
    })
      .select('_id')
      .lean();
    return admin ? admin._id.toString() : null;
  }
}

export const supportNotificationService = new SupportNotificationService();
