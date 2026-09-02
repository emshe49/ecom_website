import { Types } from 'mongoose';
import { SupportTicket } from './support-ticket.model.js';
import { SupportMessage } from './support-message.model.js';
import { SupportTicketHistory } from './support-history.model.js';
import { User } from '../users/user.model.js';
import { Order } from '../orders/order.model.js';
import { Payment } from '../payments/payment.model.js';
import { Shipment } from '../shipping/shipment.model.js';
import { ROLES } from '../authorization/roles.js';
import {
  TICKET_STATUS,
  SENDER_TYPE,
  MESSAGE_TYPE,
  HISTORY_ACTION,
  SUPPORT_CONFIG,
  TicketPriority,
  TicketStatus,
} from './support.constants.js';
import { supportTransitionService } from './support-transition.service.js';
import { supportNotificationService } from './support-notification.service.js';
import { supportMapper } from './support.mapper.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { auditService } from '../audit/audit.service.js';
import {
  AUDIT_EVENT_TYPE,
  AUDIT_CATEGORY,
  ACTOR_TYPE,
  AUDIT_OUTCOME,
  TARGET_TYPE,
} from '../audit/audit.constants.js';
import {
  StaffTicketListItemDTO,
  StaffTicketDetailDTO,
  SupportMessageDTO,
  SupportQueueQuery,
} from './support.types.js';

export class SupportAdminService {
  /**
   * Support staff queue listing with comprehensive filters, search, and pagination.
   */
  async getSupportQueue(query: SupportQueueQuery): Promise<{
    items: StaffTicketListItemDTO[];
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

    const filter: Record<string, any> = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.priority) {
      filter.priority = query.priority;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.unassigned) {
      filter.assignedTo = null;
    } else if (query.assignedTo && Types.ObjectId.isValid(query.assignedTo)) {
      filter.assignedTo = new Types.ObjectId(query.assignedTo);
    }
    if (query.customerId && Types.ObjectId.isValid(query.customerId)) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }

    // Safe regex search on ticketNumber, subject, or orderNumber
    if (query.search && query.search.trim()) {
      const sanitized = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
      const regex = new RegExp(sanitized, 'i');

      const matchingOrders = await Order.find({ orderNumber: regex }).select('_id').lean();
      const matchingOrderIds = matchingOrders.map((o) => o._id);

      filter.$or = [
        { ticketNumber: regex },
        { subject: regex },
        ...(matchingOrderIds.length > 0 ? [{ relatedOrderId: { $in: matchingOrderIds } }] : []),
      ];
    }

    const sortOptions: Record<string, 1 | -1> = {};
    if (query.sort === 'newest') {
      sortOptions.createdAt = -1;
    } else if (query.sort === 'oldest') {
      sortOptions.createdAt = 1;
    } else if (query.sort === 'priority') {
      sortOptions.priority = 1;
      sortOptions.lastMessageAt = -1;
    } else {
      sortOptions.lastMessageAt = -1;
    }

    const [totalItems, tickets] = await Promise.all([
      SupportTicket.countDocuments(filter),
      SupportTicket.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
    ]);

    // Batch resolve customers, assignees, and related orders to avoid N+1
    const customerIds = [...new Set(tickets.map((t) => t.customerId.toString()))];
    const assigneeIds = [
      ...new Set(
        tickets
          .map((t) => (t.assignedTo ? t.assignedTo.toString() : null))
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const orderIds = [
      ...new Set(
        tickets
          .map((t) => (t.relatedOrderId ? t.relatedOrderId.toString() : null))
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const [customers, assignees, orders] = await Promise.all([
      User.find({ _id: { $in: customerIds } }).select('_id firstName lastName email').lean(),
      assigneeIds.length > 0
        ? User.find({ _id: { $in: assigneeIds } }).select('_id firstName lastName email').lean()
        : [],
      orderIds.length > 0
        ? Order.find({ _id: { $in: orderIds } }).select('_id orderNumber').lean()
        : [],
    ]);

    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));
    const assigneeMap = new Map(assignees.map((a) => [a._id.toString(), a]));
    const orderMap = new Map(orders.map((o) => [o._id.toString(), o.orderNumber]));

    const items = tickets.map((t) =>
      supportMapper.toStaffTicketListItemDTO(
        t,
        customerMap.get(t.customerId.toString()),
        t.assignedTo ? assigneeMap.get(t.assignedTo.toString()) : null,
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
   * Returns staff ticket detail including internal notes, messages, and linked entities.
   */
  async getTicketDetails(ticketId: string): Promise<StaffTicketDetailDTO> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const ticket = await SupportTicket.findById(ticketId).lean();
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    // Load customer, assignee, resolver, closer
    const userIdsToFetch = [
      ticket.customerId,
      ticket.assignedTo,
      ticket.resolvedBy,
      ticket.closedBy,
    ].filter(Boolean);

    const [users, messages, history, relatedOrder, relatedPayment, relatedShipment] =
      await Promise.all([
        User.find({ _id: { $in: userIdsToFetch } }).select('_id firstName lastName email').lean(),
        SupportMessage.find({ ticketId: ticket._id })
          .populate('senderId', 'firstName lastName email')
          .sort({ createdAt: 1 })
          .lean(),
        SupportTicketHistory.find({ ticketId: ticket._id })
          .populate('actorId', 'firstName lastName email')
          .sort({ createdAt: 1 })
          .lean(),
        ticket.relatedOrderId
          ? Order.findById(ticket.relatedOrderId)
              .select('_id orderNumber status paymentStatus fulfillmentStatus total currency placedAt createdAt')
              .lean()
          : null,
        ticket.relatedPaymentId
          ? Payment.findById(ticket.relatedPaymentId)
              .select('_id paymentNumber status method amount currency')
              .lean()
          : null,
        ticket.relatedShipmentId
          ? Shipment.findById(ticket.relatedShipmentId)
              .select('_id shipmentNumber status carrier carrierName trackingNumber')
              .lean()
          : null,
      ]);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return supportMapper.toStaffTicketDetailDTO(
      ticket,
      userMap.get(ticket.customerId.toString()),
      messages,
      history,
      ticket.assignedTo ? userMap.get(ticket.assignedTo.toString()) : null,
      relatedOrder,
      relatedPayment,
      relatedShipment,
      ticket.resolvedBy ? userMap.get(ticket.resolvedBy.toString()) : null,
      ticket.closedBy ? userMap.get(ticket.closedBy.toString()) : null
    );
  }

  /**
   * Staff replies with a visible message to the customer.
   */
  async replyToTicket(
    staffUserId: string,
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

    const staff = await User.findById(staffUserId).lean();
    const customer = await User.findById(ticket.customerId).lean();
    const now = new Date();

    // 1. Create message
    const message = new SupportMessage({
      ticketId: ticket._id,
      senderId: new Types.ObjectId(staffUserId),
      senderType: SENDER_TYPE.STAFF,
      messageType: MESSAGE_TYPE.MESSAGE,
      body: body.trim(),
    });

    await message.save();

    // 2. Update ticket
    let statusChanged = false;
    let oldStatus = ticket.status;
    if (
      ticket.status === TICKET_STATUS.OPEN ||
      ticket.status === TICKET_STATUS.WAITING_FOR_SUPPORT ||
      ticket.status === TICKET_STATUS.IN_PROGRESS
    ) {
      ticket.status = TICKET_STATUS.WAITING_FOR_CUSTOMER;
      statusChanged = true;
    }

    ticket.lastMessageAt = now;
    ticket.lastStaffMessageAt = now;
    ticket.customerUnreadCount = (ticket.customerUnreadCount || 0) + 1;

    await ticket.save();

    if (statusChanged) {
      await SupportTicketHistory.create({
        ticketId: ticket._id,
        actorId: new Types.ObjectId(staffUserId),
        actorType: 'STAFF',
        action: HISTORY_ACTION.STATUS_CHANGED,
        fromValue: oldStatus,
        toValue: ticket.status,
      });
    }

    // 3. Notify customer
    if (customer) {
      await supportNotificationService.notifyStaffReply(ticket, body, {
        id: customer._id.toString(),
        email: customer.email,
      });
    }

    const senderNameMap = new Map<string, string>();
    if (staff) {
      senderNameMap.set(
        staffUserId,
        `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Support Agent'
      );
    }

    return supportMapper.toMessageDTO(message, senderNameMap);
  }

  /**
   * Staff adds an internal note (VISIBLE ONLY TO STAFF).
   * Strictly DOES NOT increment customerUnreadCount, and NEVER notifies customer!
   */
  async addInternalNote(
    staffUserId: string,
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

    const staff = await User.findById(staffUserId).lean();
    const now = new Date();

    const message = new SupportMessage({
      ticketId: ticket._id,
      senderId: new Types.ObjectId(staffUserId),
      senderType: SENDER_TYPE.STAFF,
      messageType: MESSAGE_TYPE.INTERNAL_NOTE,
      body: body.trim(),
    });

    await message.save();

    // Internal notes update lastMessageAt for queue activity, but NOT customer unread
    ticket.lastMessageAt = now;
    await ticket.save();

    auditService.recordAuditEvent({
      eventType: AUDIT_EVENT_TYPE.SUPPORT_INTERNAL_NOTE_CREATED,
      category: AUDIT_CATEGORY.SUPPORT,
      action: 'INTERNAL_NOTE_CREATED',
      actor: {
        actorType: ACTOR_TYPE.ADMIN,
        actorUserId: staffUserId,
      },
      target: {
        targetType: TARGET_TYPE.SUPPORT_TICKET,
        targetId: ticket._id.toString(),
        targetDisplay: ticket.ticketNumber,
      },
      outcome: AUDIT_OUTCOME.SUCCESS,
      metadata: {
        messageId: message._id.toString(),
      },
    }).catch(() => {});

    const senderNameMap = new Map<string, string>();
    if (staff) {
      senderNameMap.set(
        staffUserId,
        `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Staff'
      );
    }

    return supportMapper.toMessageDTO(message, senderNameMap);
  }

  /**
   * Assigns ticket to specified staff user.
   * Rejects if target user is a customer or not found.
   */
  async assignTicket(
    currentStaffId: string,
    ticketId: string,
    targetStaffId: string
  ): Promise<{ success: boolean; assignedTo: string }> {
    if (!Types.ObjectId.isValid(ticketId) || !Types.ObjectId.isValid(targetStaffId)) {
      throw new AppError('Invalid ID provided.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const targetUser = await User.findById(targetStaffId).lean();
    if (!targetUser || targetUser.role === ROLES.CUSTOMER) {
      throw new AppError(
        'Invalid assignee: Tickets cannot be assigned to customer accounts.',
        400,
        ErrorCodes.ERR_SUPPORT_INVALID_ASSIGNEE
      );
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const oldAssigneeId = ticket.assignedTo ? ticket.assignedTo.toString() : null;
    ticket.assignedTo = new Types.ObjectId(targetStaffId);
    await ticket.save();

    await SupportTicketHistory.create({
      ticketId: ticket._id,
      actorId: new Types.ObjectId(currentStaffId),
      actorType: 'STAFF',
      action: oldAssigneeId ? HISTORY_ACTION.REASSIGNED : HISTORY_ACTION.ASSIGNED,
      fromValue: oldAssigneeId,
      toValue: targetStaffId,
    });

    auditService.recordAuditEvent({
      eventType: AUDIT_EVENT_TYPE.SUPPORT_TICKET_ASSIGNED,
      category: AUDIT_CATEGORY.SUPPORT,
      action: 'TICKET_ASSIGNED',
      actor: {
        actorType: ACTOR_TYPE.ADMIN,
        actorUserId: currentStaffId,
      },
      target: {
        targetType: TARGET_TYPE.SUPPORT_TICKET,
        targetId: ticket._id.toString(),
        targetDisplay: ticket.ticketNumber,
      },
      outcome: AUDIT_OUTCOME.SUCCESS,
      before: { assignedTo: oldAssigneeId },
      after: { assignedTo: targetStaffId },
      changedFields: ['assignedTo'],
    }).catch(() => {});

    await supportNotificationService.notifyTicketAssigned(ticket, targetStaffId);

    return { success: true, assignedTo: targetStaffId };
  }

  /**
   * Concurrency-safe self-assignment.
   * Only succeeds if ticket is currently UNASSIGNED.
   */
  async assignToMe(
    staffUserId: string,
    ticketId: string
  ): Promise<{ success: boolean; assignedTo: string }> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const staffObjectId = new Types.ObjectId(staffUserId);

    // Atomic update: only set if assignedTo is null
    const ticket = await SupportTicket.findOneAndUpdate(
      { _id: ticketId, assignedTo: null },
      { $set: { assignedTo: staffObjectId } },
      { new: true }
    );

    if (!ticket) {
      const existing = await SupportTicket.findById(ticketId).lean();
      if (!existing) {
        throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
      }
      if (existing.assignedTo?.toString() === staffUserId) {
        return { success: true, assignedTo: staffUserId };
      }
      throw new AppError(
        'Ticket has already been assigned to another staff member.',
        409,
        ErrorCodes.ERR_SUPPORT_TICKET_ALREADY_ASSIGNED
      );
    }

    await SupportTicketHistory.create({
      ticketId: ticket._id,
      actorId: staffObjectId,
      actorType: 'STAFF',
      action: HISTORY_ACTION.ASSIGNED,
      fromValue: null,
      toValue: staffUserId,
    });

    auditService.recordAuditEvent({
      eventType: AUDIT_EVENT_TYPE.SUPPORT_TICKET_ASSIGNED,
      category: AUDIT_CATEGORY.SUPPORT,
      action: 'TICKET_ASSIGNED',
      actor: {
        actorType: ACTOR_TYPE.ADMIN,
        actorUserId: staffUserId,
      },
      target: {
        targetType: TARGET_TYPE.SUPPORT_TICKET,
        targetId: ticket._id.toString(),
        targetDisplay: ticket.ticketNumber,
      },
      outcome: AUDIT_OUTCOME.SUCCESS,
      before: { assignedTo: null },
      after: { assignedTo: staffUserId },
      changedFields: ['assignedTo'],
    }).catch(() => {});

    return { success: true, assignedTo: staffUserId };
  }

  /**
   * Staff updates ticket priority.
   */
  async updatePriority(
    staffUserId: string,
    ticketId: string,
    priority: TicketPriority
  ): Promise<{ success: boolean; priority: string }> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const oldPriority = ticket.priority;
    ticket.priority = priority;
    await ticket.save();

    await SupportTicketHistory.create({
      ticketId: ticket._id,
      actorId: new Types.ObjectId(staffUserId),
      actorType: 'STAFF',
      action: HISTORY_ACTION.PRIORITY_CHANGED,
      fromValue: oldPriority,
      toValue: priority,
    });

    auditService.recordAuditEvent({
      eventType: AUDIT_EVENT_TYPE.SUPPORT_TICKET_PRIORITY_CHANGED,
      category: AUDIT_CATEGORY.SUPPORT,
      action: 'PRIORITY_CHANGED',
      actor: {
        actorType: ACTOR_TYPE.ADMIN,
        actorUserId: staffUserId,
      },
      target: {
        targetType: TARGET_TYPE.SUPPORT_TICKET,
        targetId: ticket._id.toString(),
        targetDisplay: ticket.ticketNumber,
      },
      outcome: AUDIT_OUTCOME.SUCCESS,
      before: { priority: oldPriority },
      after: { priority },
      changedFields: ['priority'],
    }).catch(() => {});

    return { success: true, priority };
  }

  /**
   * Staff updates ticket status using centralized transition rules.
   */
  async updateStatus(
    staffUserId: string,
    ticketId: string,
    status: TicketStatus
  ): Promise<{ success: boolean; status: string }> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    if (ticket.status !== status) {
      supportTransitionService.validateTransition(ticket.status, status);
      const oldStatus = ticket.status;
      ticket.status = status;
      await ticket.save();

      await SupportTicketHistory.create({
        ticketId: ticket._id,
        actorId: new Types.ObjectId(staffUserId),
        actorType: 'STAFF',
        action: HISTORY_ACTION.STATUS_CHANGED,
        fromValue: oldStatus,
        toValue: status,
      });

      auditService.recordAuditEvent({
        eventType: AUDIT_EVENT_TYPE.SUPPORT_TICKET_STATUS_CHANGED,
        category: AUDIT_CATEGORY.SUPPORT,
        action: 'STATUS_CHANGED',
        actor: {
          actorType: ACTOR_TYPE.ADMIN,
          actorUserId: staffUserId,
        },
        target: {
          targetType: TARGET_TYPE.SUPPORT_TICKET,
          targetId: ticket._id.toString(),
          targetDisplay: ticket.ticketNumber,
        },
        outcome: AUDIT_OUTCOME.SUCCESS,
        before: { status: oldStatus },
        after: { status },
        changedFields: ['status'],
      }).catch(() => {});
    }

    return { success: true, status };
  }

  /**
   * Staff resolves ticket with required resolution summary.
   */
  async resolveTicket(
    staffUserId: string,
    ticketId: string,
    resolutionSummary: string
  ): Promise<{ success: boolean; status: string }> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    if (!resolutionSummary || resolutionSummary.trim().length < SUPPORT_CONFIG.MIN_RESOLUTION_LENGTH) {
      throw new AppError(
        `Resolution summary is required and must be at least ${SUPPORT_CONFIG.MIN_RESOLUTION_LENGTH} characters.`,
        400,
        ErrorCodes.ERR_SUPPORT_RESOLUTION_REQUIRED
      );
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    supportTransitionService.validateTransition(ticket.status, TICKET_STATUS.RESOLVED);

    const oldStatus = ticket.status;
    const now = new Date();

    ticket.status = TICKET_STATUS.RESOLVED;
    ticket.resolvedBy = new Types.ObjectId(staffUserId);
    ticket.resolvedAt = now;
    ticket.resolutionSummary = resolutionSummary.trim();

    await ticket.save();

    await SupportTicketHistory.create({
      ticketId: ticket._id,
      actorId: new Types.ObjectId(staffUserId),
      actorType: 'STAFF',
      action: HISTORY_ACTION.RESOLVED,
      fromValue: oldStatus,
      toValue: TICKET_STATUS.RESOLVED,
      metadata: { resolutionSummary: ticket.resolutionSummary },
    });

    auditService.recordAuditEvent({
      eventType: AUDIT_EVENT_TYPE.SUPPORT_TICKET_RESOLVED,
      category: AUDIT_CATEGORY.SUPPORT,
      action: 'TICKET_RESOLVED',
      actor: {
        actorType: ACTOR_TYPE.ADMIN,
        actorUserId: staffUserId,
      },
      target: {
        targetType: TARGET_TYPE.SUPPORT_TICKET,
        targetId: ticket._id.toString(),
        targetDisplay: ticket.ticketNumber,
      },
      outcome: AUDIT_OUTCOME.SUCCESS,
      before: { status: oldStatus },
      after: { status: TICKET_STATUS.RESOLVED },
      changedFields: ['status'],
      metadata: { resolutionSummary: ticket.resolutionSummary },
    }).catch(() => {});

    const customer = await User.findById(ticket.customerId).lean();
    if (customer) {
      await supportNotificationService.notifyTicketResolved(ticket, ticket.resolutionSummary, {
        id: customer._id.toString(),
        email: customer.email,
      });
    }

    return { success: true, status: ticket.status };
  }

  /**
   * Staff closes ticket.
   */
  async closeTicket(
    staffUserId: string,
    ticketId: string
  ): Promise<{ success: boolean; status: string }> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    supportTransitionService.validateTransition(ticket.status, TICKET_STATUS.CLOSED);

    const oldStatus = ticket.status;
    const now = new Date();

    ticket.status = TICKET_STATUS.CLOSED;
    ticket.closedBy = new Types.ObjectId(staffUserId);
    ticket.closedAt = now;

    await ticket.save();

    await SupportTicketHistory.create({
      ticketId: ticket._id,
      actorId: new Types.ObjectId(staffUserId),
      actorType: 'STAFF',
      action: HISTORY_ACTION.CLOSED,
      fromValue: oldStatus,
      toValue: TICKET_STATUS.CLOSED,
    });

    return { success: true, status: ticket.status };
  }

  /**
   * Staff marks ticket read (resets staffUnreadCount to 0).
   */
  async markAsRead(_staffUserId: string, ticketId: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new AppError('Invalid ticket ID.', 400, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    const result = await SupportTicket.findByIdAndUpdate(ticketId, {
      $set: { staffUnreadCount: 0 },
    });

    if (!result) {
      throw new AppError('Support ticket not found.', 404, ErrorCodes.ERR_SUPPORT_TICKET_NOT_FOUND);
    }

    return { success: true };
  }
}

export const supportAdminService = new SupportAdminService();
