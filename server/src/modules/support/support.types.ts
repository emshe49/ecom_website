import { Types } from 'mongoose';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  SenderType,
  MessageType,
  HistoryAction,
} from './support.constants.js';

export interface ISupportTicket {
  _id: Types.ObjectId;
  ticketNumber: string;
  customerId: Types.ObjectId;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  relatedOrderId?: Types.ObjectId | null;
  relatedPaymentId?: Types.ObjectId | null;
  relatedShipmentId?: Types.ObjectId | null;
  relatedReturnId?: Types.ObjectId | null;
  relatedRefundId?: Types.ObjectId | null;
  assignedTo?: Types.ObjectId | null;
  lastMessageAt: Date;
  lastCustomerMessageAt?: Date | null;
  lastStaffMessageAt?: Date | null;
  customerUnreadCount: number;
  staffUnreadCount: number;
  resolutionSummary?: string | null;
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  closedBy?: Types.ObjectId | null;
  closedAt?: Date | null;
  reopenedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISupportMessage {
  _id: Types.ObjectId;
  ticketId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderType: SenderType;
  messageType: MessageType;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISupportTicketHistory {
  _id: Types.ObjectId;
  ticketId: Types.ObjectId;
  actorId: Types.ObjectId;
  actorType: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
  action: HistoryAction;
  fromValue?: string | null;
  toValue?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

// DTOs

export interface CustomerTicketListItemDTO {
  id: string;
  ticketNumber: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  relatedOrderNumber?: string | null;
  customerUnreadCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessageDTO {
  id: string;
  senderId: string;
  senderType: SenderType;
  messageType: MessageType;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface SupportHistoryDTO {
  id: string;
  actorName: string;
  actorType: string;
  action: HistoryAction;
  fromValue?: string | null;
  toValue?: string | null;
  createdAt: string;
}

export interface CustomerTicketDetailDTO {
  id: string;
  ticketNumber: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  relatedOrder?: {
    orderId: string;
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
  } | null;
  resolutionSummary?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  canReopen: boolean;
  messages: SupportMessageDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffTicketListItemDTO {
  id: string;
  ticketNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  relatedOrderNumber?: string | null;
  staffUnreadCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffTicketDetailDTO {
  id: string;
  ticketNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  relatedOrder?: {
    orderId: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    total: number;
    currency: string;
    placedAt: string;
  } | null;
  relatedPayment?: {
    paymentId: string;
    paymentNumber: string;
    status: string;
    method: string;
    amount: number;
    currency: string;
  } | null;
  relatedShipment?: {
    shipmentId: string;
    shipmentNumber: string;
    status: string;
    carrier?: string | null;
    trackingNumber?: string | null;
  } | null;
  resolutionSummary?: string | null;
  resolvedBy?: {
    id: string;
    name: string;
  } | null;
  resolvedAt?: string | null;
  closedBy?: {
    id: string;
    name: string;
  } | null;
  closedAt?: string | null;
  reopenedAt?: string | null;
  messages: SupportMessageDTO[];
  history: SupportHistoryDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface SupportQueueQuery {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  unassigned?: boolean;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}
