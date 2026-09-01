import { Schema, model, Document, Types } from 'mongoose';
import {
  SHIPMENT_STATUS,
  ShipmentStatus,
  CARRIER_TYPE,
} from './shipping.constants.js';
import { ICheckoutAddressSnapshot } from '../checkout/checkout.model.js';
import { IOrderItemSnapshot, ICustomerSnapshot } from '../orders/order.types.js';

export interface IShipmentStatusHistory {
  status: ShipmentStatus;
  changedBy?: Types.ObjectId | null;
  note?: string | null;
  changedAt: Date;
}

export interface IShipmentShippingMethodSnapshot {
  shippingMethodId?: Types.ObjectId;
  code: string;
  name: string;
  fee: number;
  currency: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
}

export interface IShipment extends Document {
  _id: Types.ObjectId;
  shipmentNumber: string;
  orderId: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
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
  shippingMethod: IShipmentShippingMethodSnapshot;
  shippedAt?: Date | null;
  estimatedDeliveryAt?: Date | null;
  deliveredAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  statusHistory: IShipmentStatusHistory[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customerSnapshotSchema = new Schema<ICustomerSnapshot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const shipmentAddressSnapshotSchema = new Schema<ICheckoutAddressSnapshot>(
  {
    sourceAddressId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    stateProvince: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      default: null,
      trim: true,
    },
    postalCode: {
      type: String,
      default: null,
      trim: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const shipmentItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productSlug: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    variantAttributes: [
      {
        name: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
        _id: false,
      },
    ],
    primaryImage: {
      type: String,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for quantity.',
      },
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for unit price.',
      },
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for line total.',
      },
    },
  },
  { _id: false }
);

const shipmentShippingMethodSnapshotSchema =
  new Schema<IShipmentShippingMethodSnapshot>(
    {
      shippingMethodId: {
        type: Schema.Types.ObjectId,
        ref: 'ShippingMethod',
      },
      code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      fee: {
        type: Number,
        required: true,
        min: 0,
        validate: {
          validator: Number.isInteger,
          message: '{VALUE} is not an integer value for shipping fee.',
        },
      },
      currency: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },
      estimatedMinDays: {
        type: Number,
        required: true,
        min: 0,
      },
      estimatedMaxDays: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    { _id: false }
  );

const shipmentStatusHistorySchema = new Schema<IShipmentStatusHistory>(
  {
    status: {
      type: String,
      enum: Object.values(SHIPMENT_STATUS),
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    note: {
      type: String,
      default: null,
      maxlength: 500,
      trim: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false }
);

const shipmentSchema = new Schema<IShipment>(
  {
    shipmentNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SHIPMENT_STATUS),
      default: SHIPMENT_STATUS.PENDING,
      required: true,
      index: true,
    },
    carrier: {
      type: String,
      default: CARRIER_TYPE.MANUAL,
      trim: true,
    },
    carrierName: {
      type: String,
      default: null,
      trim: true,
    },
    service: {
      type: String,
      default: null,
      trim: true,
    },
    trackingNumber: {
      type: String,
      default: null,
      trim: true,
    },
    trackingUrl: {
      type: String,
      default: null,
      trim: true,
    },
    internalNotes: {
      type: String,
      default: null,
      maxlength: 1000,
      trim: true,
    },
    customerSnapshot: {
      type: customerSnapshotSchema,
      required: true,
    },
    shippingAddress: {
      type: shipmentAddressSnapshotSchema,
      required: true,
    },
    items: {
      type: [shipmentItemSnapshotSchema],
      required: true,
      validate: {
        validator: (v: IOrderItemSnapshot[]) =>
          Array.isArray(v) && v.length > 0,
        message: 'Shipment must contain at least one item.',
      },
    },
    shippingMethod: {
      type: shipmentShippingMethodSnapshotSchema,
      required: true,
    },
    shippedAt: {
      type: Date,
      default: null,
    },
    estimatedDeliveryAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    statusHistory: {
      type: [shipmentStatusHistorySchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

shipmentSchema.index({ userId: 1, createdAt: -1 });
shipmentSchema.index({ status: 1, createdAt: -1 });
shipmentSchema.index({ carrier: 1, status: 1 });

export const Shipment = model<IShipment>('Shipment', shipmentSchema);
