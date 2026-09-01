export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_PROCESSING'
  | 'ORDER_READY_TO_SHIP'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_PARTIALLY_REFUNDED'
  | 'SHIPMENT_CREATED'
  | 'SHIPMENT_SHIPPED'
  | 'SHIPMENT_IN_TRANSIT'
  | 'SHIPMENT_OUT_FOR_DELIVERY'
  | 'SHIPMENT_DELIVERED'
  | 'SHIPMENT_FAILED'
  | 'REVIEW_PUBLISHED'
  | 'REVIEW_HIDDEN'
  | 'REVIEW_REJECTED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'RETURN_RECEIVED'
  | 'RETURN_REFUND_PENDING'
  | 'RETURN_COMPLETED'
  | 'REFUND_SUCCEEDED'
  | 'REFUND_FAILED'
  | 'LOW_STOCK_ALERT'
  | 'SYSTEM';

export type NotificationCategory =
  | 'ORDER'
  | 'PAYMENT'
  | 'SHIPPING'
  | 'REVIEW'
  | 'RETURN'
  | 'REFUND'
  | 'INVENTORY'
  | 'PROMOTION'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPreference {
  orders: boolean;
  payments: boolean;
  shipping: boolean;
  reviews: boolean;
  returns: boolean;
  refunds: boolean;
  promotions: boolean;
  inventory: boolean;
  system: boolean;
  updatedAt: string;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  status?: 'unread' | 'read';
  category?: NotificationCategory;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
