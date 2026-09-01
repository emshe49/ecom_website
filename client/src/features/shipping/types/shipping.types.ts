export const SHIPMENT_STATUS = {
  PENDING: 'PENDING',
  READY_TO_SHIP: 'READY_TO_SHIP',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUS)[keyof typeof SHIPMENT_STATUS];

export const SHIPPING_METHOD_TYPE = {
  STANDARD: 'STANDARD',
  EXPRESS: 'EXPRESS',
  FREE_SHIPPING: 'FREE_SHIPPING',
  FREE_TIERED: 'FREE_TIERED',
  FLAT_RATE: 'FLAT_RATE',
  SAME_DAY: 'SAME_DAY',
  CUSTOM: 'CUSTOM',
} as const;

export type ShippingMethodType = (typeof SHIPPING_METHOD_TYPE)[keyof typeof SHIPPING_METHOD_TYPE];

export const CARRIER_TYPE = {
  TCS: 'TCS',
  LEOPARDS: 'LEOPARDS',
  DHL: 'DHL',
  FEDEX: 'FEDEX',
  TRAX: 'TRAX',
  M_AND_P: 'M_AND_P',
  LOCAL_COURIER: 'LOCAL_COURIER',
  MANUAL: 'MANUAL',
} as const;

export type CarrierType = (typeof CARRIER_TYPE)[keyof typeof CARRIER_TYPE] | string;

export interface IShippingEligibility {
  minimumOrderAmount?: number | null;
  maximumOrderAmount?: number | null;
  allowedCountries?: string[];
  allowedRegions?: string[];
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
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    stateProvince: string;
    postalCode?: string | null;
    country: string;
  };
  items: Array<{
    variantId: string;
    sku: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string | null;
  }>;
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
  customerSnapshot: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    stateProvince: string;
    postalCode?: string | null;
    country: string;
  };
  items: Array<{
    variantId: string;
    sku: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string | null;
  }>;
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
  carrierName?: string | null;
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

export interface AdminShipmentQueryFilters {
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
