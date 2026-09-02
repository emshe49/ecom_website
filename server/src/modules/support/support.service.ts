import { Types } from 'mongoose';
import { SupportTicket } from './support-ticket.model.js';
import { SupportMessage } from './support-message.model.js';
import { SupportTicketHistory } from './support-history.model.js';
import { Order } from '../orders/order.model.js';
import { User } from '../users/user.model.js';
import {
  TICKET_STATUS,
  TICKET_PRIORITY,
  SENDER_TYPE,
  MESSAGE_TYPE,
  HISTORY_ACTION,
  SUPPORT_CONFIG,
} from './support.constants.js';
import { supportNumberService } from './support-number.service.js';
import { supportReferenceService } from './support-reference.service.js';
import { supportTransitionService } from './support-transition.service.js';
import { supportNotificationService } from './support-notification.service.js';
import { supportMapper } from './support.mapper.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import {
  CustomerTicketListItemDTO,
  CustomerTicketDetailDTO,
  SupportMessageDTO,
} from './support.types.js';

export class SupportService {
  /**
   * Customer creates a new support ticket.
   */
  async createTicket(
    customerId: string,
    input: {
      subject: string;
      category: any;
      message: string;
      relatedOrderId?: string;
      relatedPaymentId?: string;
      relatedShipmentId?: string;
      relatedReturnId?: string;
      relatedRefundId?: string;
    }
  ): Promise<CustomerTicketDetailDTO> {
    const customer = await User.findById(customerId).lean();
    if (!customer) {
      throw new AppError('Customer not found.', 404, ErrorCodes.ERR_USER_NOT_FOUND);
    }

    // 1. Validate references
    const validatedRefs = await supportReferenceService.validateReferences(customerId, {
      relatedOrderId: input.relatedOrderId,
      relatedPaymentId: input.relatedPaymentId,
      relatedShipmentId: input.relatedShipmentId,
      relatedReturnId: input.relatedReturnId,
      relatedRefundId: input.relatedRefundId,
    });

    // 2. Generate concurrency-safe ticket number
    const ticketNumber = await supportNumberService.generateTicketNumber();

    const now = new Date();

    // 3. Create SupportTicket
    const ticket = new SupportTicket({
      ticketNumber,
      customerId: new Types.ObjectId(customerId),
      subject: input.subject.trim(),
      category: input.category,
      priority: TICKET_PRIORITY.NORMAL, // Server controlled
      status: TICKET_STATUS.OPEN, // Server controlled
      relatedOrderId: validatedRefs.orderId || null,
      relatedPaymentId: validatedRefs.paymentId || null,
      relatedShipmentId: validatedRefs.shipmentId || null,
      relatedReturnId: validatedRefs.returnId || null,
      relatedRefundId: validatedRefs.refundId || null,
      assignedTo: null,
      lastMessageAt: now,
      lastCustomerMessageAt: now,
      lastStaffMessageAt: null,
      customerUnreadCount: 0,
      staffUnreadCount: 1, // Staff queue has new unread message
    });

    await ticket.save();

    // 4. Create initial SupportMessage
    const firstMessage = new SupportMessage({
      ticketId: ticket._id,
      senderId: new Types.ObjectId(customerId),
      senderType: SENDER_TYPE.CUSTOMER,
      messageType: MESSAGE_TYPE.MESSAGE,
      body: input.message.trim(),
    });

    await firstMessage.save();

    // 5. Create History audit record
    await SupportTicketHistory.create({
      ticketId: ticket._id,
      actorId: new Types.ObjectId(customerId),
      actorType: 'CUSTOMER',
      action: HISTORY_ACTION.CREATED,
      fromValue: null,
      toValue: TICKET_STATUS.OPEN,
      metadata: {
        category: ticket.category,
        priority: ticket.priority,
      },
    });

    // 6. Side effects: Notifications & Email (Try/Catch inside service)
    await supportNotificationService.notifyTicketCreated(ticket, {
      id: customerId,
      email: customer.email,
      firstName: customer.firstName,
    });

    let relatedOrder = null;
    if (ticket.relatedOrderId) {
      relatedOrder = await Order.findById(ticket.relatedOrderId).select('orderNumber status total currency').lean();
    }

    const senderNameMap = new Map<string, string>();
    senderNameMap.set(customerId, `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'You');

    return supportMapper.toCustomerTicketDetailDTO(
      ticket,
      [firstMessage],
      relatedOrder,
      senderNameMap
    );
  }

  /**
   * Returns authenticated customer's paginated tickets.
   */
  async getCustomerTickets(
    customerId: string,
    query: {
      status?: any;
      category?: any;
      page?: number;
      limit?: number;
      sort?: string;
    }
  ): Promise<{
    items: CustomerTicketListItemDTO[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = query.page && query.page > 0 ? query.page : SUPPORT_CONFIG.DEFAULT_PAGE;
    const limit =
      query.limit && query.limit > 0
        ? Math.min(query.limit, SUPPORT_CONFIG.MAX_LIMIT)
        : SUPPORT_CONFIG.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      customerId: new Types.ObjectId(customerId),
    };

    if (query.status) {
      filter.status = query.status;
    }
    if (query.category) {
      filter.category = query.category;
    }

    const sortOptions: Record<string, 1 | -1> = {};
    if (query.sort === 'newest') {
      sortOptions.createdAt = -1;
    } else if (query.sort === 'oldest') {
      sortOptions.createdAt = 1;
    } else {
      sortOptions.lastMessageAt = -1;
    }

    const [totalItems, tickets] = await Promise.all([
      SupportTicket.countDocuments(filter),
      SupportTicket.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
    ]);

    // Batch resolve orderNumbers for related orders
    const orderIds = tickets
      .map((t) => t.relatedOrderId)
      .filter((id): id is Types.ObjectId => Boolean(id));

    const orderMap = new Map<string, string>();
    if (orderIds.length > 0) {
      const orders = await Order.find({ _id: { $in: orderIds } })
        .select('_id orderNumber')
        .lean();
      orders.forEach((o) => orderMap.set(o._id.toString(), o.orderNumber));
    }

    const items = tickets.map((t) =>
      supportMapper.toCustomerTicketListItemDTO(
        t,
        t.relatedOrderId ? orderMap.get(t.relatedOrderId.toString()) : null
      )
    );

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Returns ticket detail for authenticated customer.
   * STRICT IDOR: Rejects if ticket does not belong to customer.
   * Strips internal notes completely!
   */
  async getTicketDetails(
    customerId: string,
    ticketId: string
  ): Promise<CustomerTicketDetailDTO> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const ticket = await SupportTicket.findById(ticketId).lean();
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    if (ticket.customerId.toString() !== customerId.toString()) {
      throw new AppError(
        'You do not have permission to view this ticket.',
        403,
        ErrorCodes.ERR_SUPPORT_TICKET_FORBIDDEN
      );
    }

    // Customer query: strictly exclude INTERNAL_NOTE
    const messages = await SupportMessage.find({
      ticketId: ticket._id,
      messageType: { $ne: MESSAGE_TYPE.INTERNAL_NOTE },
    })
      .populate('senderId', 'firstName lastName email')
      .sort({ createdAt: 1 })
      .lean();

    let relatedOrder = null;
    if (ticket.relatedOrderId) {
      relatedOrder = await Order.findById(ticket.relatedOrderId)
        .select('orderNumber status total currency')
        .lean();
    }

    return supportMapper.toCustomerTicketDetailDTO(ticket, messages, relatedOrder);
  }

  /**
   * Customer replies to an open or in-progress ticket.
   */
  async replyToTicket(
    customerId: string,
    ticketId: string,
    body: string
  ): Promise<SupportMessageDTO> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    if (ticket.customerId.toString() !== customerId.toString()) {
      throw new AppError(
        'You do not have permission to reply to this ticket.',
        403,
        ErrorCodes.ERR_SUPPORT_TICKET_FORBIDDEN
      );
    }

    if (ticket.status === TICKET_STATUS.CLOSED) {
      throw new AppError(
        'Cannot reply to a closed ticket. Please create a new ticket.',
        400,
        ErrorCodes.ERR_SUPPORT_TICKET_CLOSED
      );
    }

    const customer = await User.findById(customerId).lean();
    const now = new Date();

    // 1. Create message
    const message = new SupportMessage({
      ticketId: ticket._id,
      senderId: new Types.ObjectId(customerId),
      senderType: SENDER_TYPE.CUSTOMER,
      messageType: MESSAGE_TYPE.MESSAGE,
      body: body.trim(),
    });

    await message.save();

    // 2. State transition: WAITING_FOR_CUSTOMER -> WAITING_FOR_SUPPORT
    let statusChanged = false;
    let oldStatus = ticket.status;
    if (
      ticket.status === TICKET_STATUS.WAITING_FOR_CUSTOMER ||
      ticket.status === TICKET_STATUS.IN_PROGRESS ||
      ticket.status === TICKET_STATUS.OPEN
    ) {
      ticket.status = TICKET_STATUS.WAITING_FOR_SUPPORT;
      statusChanged = true;
    }

    ticket.lastMessageAt = now;
    ticket.lastCustomerMessageAt = now;
    ticket.staffUnreadCount = (ticket.staffUnreadCount || 0) + 1;

    await ticket.save();

    if (statusChanged) {
      await SupportTicketHistory.create({
        ticketId: ticket._id,
        actorId: new Types.ObjectId(customerId),
        actorType: 'CUSTOMER',
        action: HISTORY_ACTION.STATUS_CHANGED,
        fromValue: oldStatus,
        toValue: ticket.status,
      });
    }

    // 3. Notify assigned staff
    await supportNotificationService.notifyCustomerReply(ticket);

    const senderNameMap = new Map<string, string>();
    if (customer) {
      senderNameMap.set(
        customerId,
        `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'You'
      );
    }

    return supportMapper.toMessageDTO(message, senderNameMap);
  }

  /**
   * Customer marks ticket as read (resets customerUnreadCount to 0).
   */
  async markAsRead(customerId: string, ticketId: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const result = await SupportTicket.findOneAndUpdate(
      { _id: ticketId, customerId: new Types.ObjectId(customerId) },
      { $set: { customerUnreadCount: 0 } }
    );

    if (!result) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    return { success: true };
  }

  /**
   * Customer reopens a RESOLVED ticket within the 7-day window.
   */
  async reopenTicket(customerId: string, ticketId: string): Promise<{ success: boolean; status: string }> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    if (ticket.customerId.toString() !== customerId.toString()) {
      throw new AppError(
        'You do not have permission to reopen this ticket.',
        403,
        ErrorCodes.ERR_SUPPORT_TICKET_FORBIDDEN
      );
    }

    // Validate 7-day window & RESOLVED status
    supportTransitionService.validateCustomerReopen(ticket);

    const oldStatus = ticket.status;
    ticket.status = TICKET_STATUS.WAITING_FOR_SUPPORT;
    ticket.reopenedAt = new Date();
    ticket.staffUnreadCount = (ticket.staffUnreadCount || 0) + 1;

    await ticket.save();

    await SupportTicketHistory.create({
      ticketId: ticket._id,
      actorId: new Types.ObjectId(customerId),
      actorType: 'CUSTOMER',
      action: HISTORY_ACTION.REOPENED,
      fromValue: oldStatus,
      toValue: ticket.status,
    });

    await supportNotificationService.notifyTicketReopened(ticket);

    return { success: true, status: ticket.status };
  }

  /**
   * Customer confirms resolution and closes the ticket.
   */
  async closeTicket(customerId: string, ticketId: string): Promise<{ success: boolean; status: string }> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    if (ticket.customerId.toString() !== customerId.toString()) {
      throw new AppError(
        'You do not have permission to close this ticket.',
        403,
        ErrorCodes.ERR_SUPPORT_TICKET_FORBIDDEN
      );
    }

    if (ticket.status !== TICKET_STATUS.RESOLVED && ticket.status !== TICKET_STATUS.OPEN) {
      supportTransitionService.validateTransition(ticket.status, TICKET_STATUS.CLOSED);
    }

    const oldStatus = ticket.status;
    ticket.status = TICKET_STATUS.CLOSED;
    ticket.closedBy = new Types.ObjectId(customerId);
    ticket.closedAt = new Date();

    await ticket.save();

    await SupportTicketHistory.create({
      ticketId: ticket._id,
      actorId: new Types.ObjectId(customerId),
      actorType: 'CUSTOMER',
      action: HISTORY_ACTION.CLOSED,
      fromValue: oldStatus,
      toValue: ticket.status,
    });

    return { success: true, status: ticket.status };
  }
}

export const supportService = new SupportService();
