import { Schema, model, Document, Types } from 'mongoose';
import {
  ORDER_STATUS,
  OrderStatus,
  PAYMENT_STATUS,
  PaymentStatus,
  FULFILLMENT_STATUS,
  FulfillmentStatus,
} from './order.constants.js';
import {
  IOrderItemSnapshot,
  ICustomerSnapshot,
  IOrderStatusHistory,
} from './order.types.js';
import { ICheckoutAddressSnapshot } from '../checkout/checkout.model.js';

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  checkoutSessionId: Types.ObjectId;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  items: IOrderItemSnapshot[];
  customerSnapshot: ICustomerSnapshot;
  shippingAddress: ICheckoutAddressSnapshot;
  billingAddress: ICheckoutAddressSnapshot;
  subtotal: number;
  total: number;
  currency: string;
  customerNotes?: string | null;
  internalNotes?: string | null;
  statusHistory: IOrderStatusHistory[];
  placedAt: Date;
  cancelledAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
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

const orderAddressSnapshotSchema = new Schema<ICheckoutAddressSnapshot>(
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

const statusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
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

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    checkoutSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'CheckoutSession',
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PLACED,
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.UNPAID,
      required: true,
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: Object.values(FULFILLMENT_STATUS),
      default: FULFILLMENT_STATUS.UNFULFILLED,
      required: true,
    },
    items: {
      type: [orderItemSnapshotSchema],
      required: true,
      validate: {
        validator: (v: IOrderItemSnapshot[]) => Array.isArray(v) && v.length > 0,
        message: 'Order must contain at least one item.',
      },
    },
    customerSnapshot: {
      type: customerSnapshotSchema,
      required: true,
    },
    shippingAddress: {
      type: orderAddressSnapshotSchema,
      required: true,
    },
    billingAddress: {
      type: orderAddressSnapshotSchema,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for subtotal.',
      },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for total.',
      },
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    customerNotes: {
      type: String,
      default: null,
      maxlength: 500,
    },
    internalNotes: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    placedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performant customer and admin queries
orderSchema.index({ userId: 1, placedAt: -1 });
orderSchema.index({ status: 1, placedAt: -1 });
orderSchema.index({ paymentStatus: 1, placedAt: -1 });

export const Order = model<IOrder>('Order', orderSchema);
