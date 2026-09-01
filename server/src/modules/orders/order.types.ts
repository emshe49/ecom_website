import { Types } from 'mongoose';
import {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from './order.constants.js';



export interface IOrderItemSnapshot {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  productName: string;
  productSlug: string;
  sku: string;
  variantAttributes: Array<{ name: string; value: string }>;
  primaryImage?: string | null;
  quantity: number;
  unitPrice: number; // minor units
  lineTotal: number; // minor units
}

export interface ICustomerSnapshot {
  userId: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  changedBy: Types.ObjectId | null;
  note?: string | null;
  changedAt: Date;
}

export interface OrderItemDTO {
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

export interface CustomerSnapshotDTO {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface AddressSnapshotDTO {
  sourceAddressId: string;
  fullName: string;
  phone: string;
  country: string;
  stateProvince: string;
  city: string;
  area?: string | null;
  postalCode?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
}

export interface StatusHistoryDTO {
  status: OrderStatus;
  changedBy: string | null;
  note?: string | null;
  changedAt: string;
}

export interface OrderSummaryDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  total: number;
  currency: string;
  placedAt: string;
  primaryImages: string[];
}

export interface OrderDetailDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: OrderItemDTO[];
  shippingAddress: AddressSnapshotDTO;
  billingAddress: AddressSnapshotDTO;
  subtotal: number;
  total: number;
  currency: string;
  customerNotes?: string | null;
  statusHistory: StatusHistoryDTO[];
  canCancel: boolean;
  placedAt: string;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderDetailDTO extends OrderDetailDTO {
  customer: CustomerSnapshotDTO;
  internalNotes?: string | null;
  allowedTransitions: OrderStatus[];
  checkoutSessionId: string;
}

export interface CreateOrderInput {
  customerNotes?: string;
}

export interface CancelOrderInput {
  reason?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  note?: string;
}

export interface AdminCancelOrderInput {
  reason: string;
}

export interface UpdateInternalNoteInput {
  internalNotes: string;
}

export interface CustomerOrderListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  sort?: 'newest' | 'oldest' | 'total-high' | 'total-low';
}

export interface AdminOrderListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'oldest' | 'total-high' | 'total-low' | 'status';
}
