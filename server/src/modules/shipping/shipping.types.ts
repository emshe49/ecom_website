import { ShipmentStatus, ShippingMethodType } from './shipping.constants.js';
import { ICheckoutAddressSnapshot } from '../checkout/checkout.model.js';
import { IOrderItemSnapshot, ICustomerSnapshot } from '../orders/order.types.js';

export interface ShippingQuoteInput {
  shippingAddressId: string;
}

export interface EligibleShippingMethodDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: ShippingMethodType;
  fee: number;
  currency: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
}

export interface ShippingQuoteResponseDTO {
  destination: {
    country: string;
    city: string;
    stateProvince: string;
  };
  subtotal: number;
  currency: string;
  methods: EligibleShippingMethodDTO[];
}

export interface ShippingMethodDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: ShippingMethodType;
  baseFee: number;
  freeAboveSubtotal?: number | null;
  currency: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  active: boolean;
  sortOrder: number;
  displayOrder?: number;
  eligibility: {
    minimumOrderAmount?: number | null;
    maximumOrderAmount?: number | null;
    allowedCountries: string[];
    allowedRegions: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateShippingMethodInput {
  code: string;
  name: string;
  description?: string | null;
  type?: ShippingMethodType;
  baseFee: number;
  freeAboveSubtotal?: number | null;
  currency?: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  active?: boolean;
  sortOrder?: number;
  displayOrder?: number;
  eligibility?: {
    minimumOrderAmount?: number | null;
    maximumOrderAmount?: number | null;
    allowedCountries?: string[];
    allowedRegions?: string[];
  };
}

export interface UpdateShippingMethodInput {
  code?: string;
  name?: string;
  description?: string | null;
  type?: ShippingMethodType;
  baseFee?: number;
  freeAboveSubtotal?: number | null;
  currency?: string;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  active?: boolean;
  sortOrder?: number;
  displayOrder?: number;
  eligibility?: {
    minimumOrderAmount?: number | null;
    maximumOrderAmount?: number | null;
    allowedCountries?: string[];
    allowedRegions?: string[];
  };
}

export interface CreateShipmentInput {
  carrier?: string;
  carrierName?: string | null;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  initialNote?: string | null;
  internalNotes?: string | null;
}

export interface UpdateShipmentStatusInput {
  status: ShipmentStatus;
  note?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

export interface UpdateShipmentTrackingInput {
  carrier: string;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

export interface ShipmentStatusHistoryDTO {
  status: ShipmentStatus;
  changedBy?: string | null;
  note?: string | null;
  changedAt: string;
}

export interface CustomerShipmentDTO {
  id: string;
  shipmentNumber: string;
  orderId: string;
  orderNumber: string;
  status: ShipmentStatus;
  carrier: string;
  carrierName?: string | null;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingAddress: ICheckoutAddressSnapshot;
  items: IOrderItemSnapshot[];
  shippingMethod: {
    code: string;
    name: string;
    fee: number;
    currency: string;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  };
  shippedAt?: string | null;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  statusHistory: ShipmentStatusHistoryDTO[];
}

export interface AdminShipmentDetailDTO {
  id: string;
  shipmentNumber: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  status: ShipmentStatus;
  carrier: string;
  carrierName?: string | null;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  internalNotes?: string | null;
  customerSnapshot: ICustomerSnapshot;
  shippingAddress: ICheckoutAddressSnapshot;
  items: IOrderItemSnapshot[];
  shippingMethod: {
    shippingMethodId?: string;
    code: string;
    name: string;
    fee: number;
    currency: string;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  };
  shippedAt?: string | null;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  statusHistory: ShipmentStatusHistoryDTO[];
  allowedTransitions: ShipmentStatus[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminShipmentSummaryDTO {
  id: string;
  shipmentNumber: string;
  orderId: string;
  orderNumber: string;
  status: ShipmentStatus;
  carrier: string;
  trackingNumber?: string | null;
  customer: {
    fullName: string;
    email: string;
  };
  destinationCity: string;
  itemCount: number;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
}

export interface AdminShipmentListQuery {
  page?: number;
  limit?: number;
  status?: ShipmentStatus;
  carrier?: string;
  search?: string;
  orderNumber?: string;
  trackingNumber?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}
