export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'UNPAID'
  | 'AUTHORIZED'
  | 'PAID'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'FAILED';

export type FulfillmentStatus =
  | 'UNFULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURNED';

export interface OrderItemSnapshot {
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  sku: string;
  variantAttributes: Array<{ name: string; value: string }>;
  primaryImage: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AddressSnapshot {
  sourceAddressId?: string;
  fullName: string;
  phone: string;
  country: string;
  stateProvince: string;
  city: string;
  area: string | null;
  postalCode: string | null;
  addressLine1: string;
  addressLine2: string | null;
}

export interface CustomerSnapshot {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  changedAt: string;
  changedBy: string;
  note?: string;
}

export interface OrderListItemDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  itemCount: number;
  firstItemName: string;
  firstItemImage: string | null;
  canCancel: boolean;
  placedAt: string;
  createdAt: string;
}

export interface OrderDetailDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: OrderItemSnapshot[];
  shippingAddress: AddressSnapshot;
  billingAddress: AddressSnapshot;
  shippingMethod?: {
    shippingMethodId?: string;
    code: string;
    name: string;
    fee: number;
    currency: string;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  };
  shippingFee: number;
  subtotal: number;
  total: number;
  currency: string;
  customerNotes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  statusHistory: StatusHistoryEntry[];
  canCancel: boolean;
  placedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderListItemDTO extends OrderListItemDTO {
  customer: CustomerSnapshot;
  userId: string;
}

export interface AdminOrderDetailDTO extends OrderDetailDTO {
  userId: string;
  checkoutSessionId: string;
  customerSnapshot: CustomerSnapshot;
  cancelledBy?: string;
  internalNotes?: string;
  allowedNextStatuses: OrderStatus[];
  canAdminCancel: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CustomerOrdersResponse {
  success: boolean;
  data: {
    orders: OrderListItemDTO[];
    pagination: PaginationMeta;
  };
}

export interface CustomerOrderDetailResponse {
  success: boolean;
  data: {
    order: OrderDetailDTO;
  };
}

export interface AdminOrdersResponse {
  success: boolean;
  data: {
    orders: AdminOrderListItemDTO[];
    pagination: PaginationMeta;
  };
}

export interface AdminOrderDetailResponse {
  success: boolean;
  data: {
    order: AdminOrderDetailDTO;
  };
}

export interface CreateOrderPayload {
  customerNotes?: string;
}

export interface CancelOrderPayload {
  reason?: string;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  note?: string;
}

export interface UpdateInternalNotesPayload {
  internalNotes: string;
}
