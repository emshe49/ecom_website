import {
  ISupportTicket,
  ISupportMessage,
  CustomerTicketListItemDTO,
  CustomerTicketDetailDTO,
  StaffTicketListItemDTO,
  StaffTicketDetailDTO,
  SupportMessageDTO,
  SupportHistoryDTO,
} from './support.types.js';
import { MESSAGE_TYPE } from './support.constants.js';
import { supportTransitionService } from './support-transition.service.js';

export class SupportMapper {
  /**
   * Maps a SupportMessage document to a safe DTO.
   */
  toMessageDTO(message: any, senderNameMap?: Map<string, string>): SupportMessageDTO {
    const senderIdStr = message.senderId?._id
      ? message.senderId._id.toString()
      : message.senderId?.toString() || '';

    let senderName = 'Unknown';
    if (message.senderId && typeof message.senderId === 'object' && message.senderId.firstName) {
      senderName = `${message.senderId.firstName} ${message.senderId.lastName || ''}`.trim();
    } else if (senderNameMap && senderNameMap.has(senderIdStr)) {
      senderName = senderNameMap.get(senderIdStr)!;
    } else if (message.senderType === 'STAFF') {
      senderName = 'Support Agent';
    } else if (message.senderType === 'CUSTOMER') {
      senderName = 'Customer';
    }

    return {
      id: message._id.toString(),
      senderId: senderIdStr,
      senderType: message.senderType,
      messageType: message.messageType,
      senderName,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Maps SupportTicketHistory to safe DTO.
   */
  toHistoryDTO(history: any, actorNameMap?: Map<string, string>): SupportHistoryDTO {
    const actorIdStr = history.actorId?._id
      ? history.actorId._id.toString()
      : history.actorId?.toString() || '';

    let actorName = 'System';
    if (history.actorId && typeof history.actorId === 'object' && history.actorId.firstName) {
      actorName = `${history.actorId.firstName} ${history.actorId.lastName || ''}`.trim();
    } else if (actorNameMap && actorNameMap.has(actorIdStr)) {
      actorName = actorNameMap.get(actorIdStr)!;
    } else if (history.actorType === 'CUSTOMER') {
      actorName = 'Customer';
    } else if (history.actorType === 'STAFF') {
      actorName = 'Staff';
    }

    return {
      id: history._id.toString(),
      actorName,
      actorType: history.actorType,
      action: history.action,
      fromValue: history.fromValue || null,
      toValue: history.toValue || null,
      createdAt: history.createdAt.toISOString(),
    };
  }

  /**
   * Maps ticket to Customer list item.
   */
  toCustomerTicketListItemDTO(
    ticket: ISupportTicket,
    orderNumber?: string | null
  ): CustomerTicketListItemDTO {
    return {
      id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      relatedOrderNumber: orderNumber || null,
      customerUnreadCount: ticket.customerUnreadCount || 0,
      lastMessageAt: ticket.lastMessageAt.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }

  /**
   * Maps ticket, messages, and related order to customer-visible ticket detail DTO.
   * STRICTLY strips internal notes!
   */
  toCustomerTicketDetailDTO(
    ticket: ISupportTicket,
    messages: ISupportMessage[],
    relatedOrder?: any | null,
    senderNameMap?: Map<string, string>
  ): CustomerTicketDetailDTO {
    const visibleMessages = messages
      .filter((m) => m.messageType !== MESSAGE_TYPE.INTERNAL_NOTE)
      .map((m) => this.toMessageDTO(m, senderNameMap));

    const { canReopen } = supportTransitionService.canCustomerReopen(ticket);

    return {
      id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      relatedOrder: relatedOrder
        ? {
            orderId: relatedOrder._id.toString(),
            orderNumber: relatedOrder.orderNumber,
            status: relatedOrder.status,
            total: relatedOrder.total,
            currency: relatedOrder.currency,
          }
        : null,
      resolutionSummary: ticket.resolutionSummary || null,
      resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
      closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
      canReopen,
      messages: visibleMessages,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }

  /**
   * Maps ticket to Staff list item DTO.
   */
  toStaffTicketListItemDTO(
    ticket: any,
    customer: any,
    assignee?: any | null,
    orderNumber?: string | null
  ): StaffTicketListItemDTO {
    return {
      id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      customer: {
        id: customer._id ? customer._id.toString() : ticket.customerId.toString(),
        name: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email : 'Unknown',
        email: customer?.email || '',
      },
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: assignee
        ? {
            id: assignee._id ? assignee._id.toString() : ticket.assignedTo.toString(),
            name: `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.email,
            email: assignee.email || '',
          }
        : null,
      relatedOrderNumber: orderNumber || null,
      staffUnreadCount: ticket.staffUnreadCount || 0,
      lastMessageAt: ticket.lastMessageAt.toISOString(),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }

  /**
   * Maps ticket to Staff detail DTO.
   * Includes messages (both public and internal notes) and audit history.
   */
  toStaffTicketDetailDTO(
    ticket: any,
    customer: any,
    messages: any[],
    history: any[],
    assignee?: any | null,
    relatedOrder?: any | null,
    relatedPayment?: any | null,
    relatedShipment?: any | null,
    resolvedByUser?: any | null,
    closedByUser?: any | null,
    senderNameMap?: Map<string, string>
  ): StaffTicketDetailDTO {
    return {
      id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      customer: {
        id: customer._id ? customer._id.toString() : ticket.customerId.toString(),
        name: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email : 'Unknown',
        email: customer?.email || '',
      },
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: assignee
        ? {
            id: assignee._id ? assignee._id.toString() : ticket.assignedTo.toString(),
            name: `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.email,
            email: assignee.email || '',
          }
        : null,
      relatedOrder: relatedOrder
        ? {
            orderId: relatedOrder._id.toString(),
            orderNumber: relatedOrder.orderNumber,
            status: relatedOrder.status,
            paymentStatus: relatedOrder.paymentStatus,
            fulfillmentStatus: relatedOrder.fulfillmentStatus,
            total: relatedOrder.total,
            currency: relatedOrder.currency,
            placedAt: relatedOrder.placedAt ? relatedOrder.placedAt.toISOString() : relatedOrder.createdAt.toISOString(),
          }
        : null,
      relatedPayment: relatedPayment
        ? {
            paymentId: relatedPayment._id.toString(),
            paymentNumber: relatedPayment.paymentNumber,
            status: relatedPayment.status,
            method: relatedPayment.method,
            amount: relatedPayment.amount,
            currency: relatedPayment.currency,
          }
        : null,
      relatedShipment: relatedShipment
        ? {
            shipmentId: relatedShipment._id.toString(),
            shipmentNumber: relatedShipment.shipmentNumber,
            status: relatedShipment.status,
            carrier: relatedShipment.carrier || relatedShipment.carrierName || null,
            trackingNumber: relatedShipment.trackingNumber || null,
          }
        : null,
      resolutionSummary: ticket.resolutionSummary || null,
      resolvedBy: resolvedByUser
        ? {
            id: resolvedByUser._id.toString(),
            name: `${resolvedByUser.firstName || ''} ${resolvedByUser.lastName || ''}`.trim() || resolvedByUser.email,
          }
        : null,
      resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
      closedBy: closedByUser
        ? {
            id: closedByUser._id.toString(),
            name: `${closedByUser.firstName || ''} ${closedByUser.lastName || ''}`.trim() || closedByUser.email,
          }
        : null,
      closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
      reopenedAt: ticket.reopenedAt ? ticket.reopenedAt.toISOString() : null,
      messages: messages.map((m) => this.toMessageDTO(m, senderNameMap)),
      history: history.map((h) => this.toHistoryDTO(h, senderNameMap)),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }
}

export const supportMapper = new SupportMapper();
