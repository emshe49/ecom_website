export type TicketCategory =
  | 'ORDER'
  | 'PAYMENT'
  | 'SHIPPING'
  | 'RETURN'
  | 'REFUND'
  | 'PRODUCT'
  | 'ACCOUNT'
  | 'PROMOTION'
  | 'TECHNICAL'
  | 'OTHER';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'WAITING_FOR_SUPPORT'
  | 'RESOLVED'
  | 'CLOSED';

export type SenderType = 'CUSTOMER' | 'STAFF';

export type MessageType = 'MESSAGE' | 'INTERNAL_NOTE' | 'SYSTEM';

export type HistoryAction =
  | 'CREATED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'UNASSIGNED'
  | 'PRIORITY_CHANGED'
  | 'STATUS_CHANGED'
  | 'RESOLVED'
  | 'REOPENED'
  | 'CLOSED';

export interface CustomerTicketListItem {
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

export interface SupportMessageItem {
  id: string;
  senderId: string;
  senderType: SenderType;
  messageType: MessageType;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface SupportHistoryItem {
  id: string;
  actorName: string;
  actorType: string;
  action: HistoryAction;
  fromValue?: string | null;
  toValue?: string | null;
  createdAt: string;
}

export interface CustomerTicketDetail {
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
  messages: SupportMessageItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffTicketListItem {
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

export interface StaffTicketDetail {
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
  messages: SupportMessageItem[];
  history: SupportHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SupportQueueFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  unassigned?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
