import { Schema, model, Document, Types } from 'mongoose';
import { CHECKOUT_STATUS, CheckoutStatus } from './checkout.constants.js';

export interface ICheckoutItemSnapshot {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  productName: string;
  productSlug: string;
  sku: string;
  variantAttributes: Array<{ name: string; value: string }>;
  primaryImage?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ICheckoutAddressSnapshot {
  sourceAddressId: Types.ObjectId;
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

export interface ICheckoutShippingMethodSnapshot {
  shippingMethodId?: Types.ObjectId;
  code: string;
  name: string;
  fee: number;
  currency: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
}

export interface ICheckoutSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  status: CheckoutStatus;
  items: ICheckoutItemSnapshot[];
  shippingAddress: ICheckoutAddressSnapshot;
  billingAddress: ICheckoutAddressSnapshot;
  shippingMethod?: ICheckoutShippingMethodSnapshot;
  shippingFee: number;
  subtotal: number;
  total: number;
  currency: string;
  inventoryReserved: boolean;
  expiresAt: Date;
  lastValidatedAt: Date;
  cancelledAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const checkoutItemSnapshotSchema = new Schema<ICheckoutItemSnapshot>(
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

const checkoutAddressSnapshotSchema = new Schema<ICheckoutAddressSnapshot>(
  {
    sourceAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'Address',
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

const checkoutShippingMethodSnapshotSchema =
  new Schema<ICheckoutShippingMethodSnapshot>(
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

const checkoutSessionSchema = new Schema<ICheckoutSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CHECKOUT_STATUS),
      default: CHECKOUT_STATUS.ACTIVE,
      required: true,
      index: true,
    },
    items: {
      type: [checkoutItemSnapshotSchema],
      required: true,
      validate: {
        validator: (v: ICheckoutItemSnapshot[]) => Array.isArray(v) && v.length > 0,
        message: 'CheckoutSession must contain at least one item.',
      },
    },
    shippingAddress: {
      type: checkoutAddressSnapshotSchema,
      required: true,
    },
    billingAddress: {
      type: checkoutAddressSnapshotSchema,
      required: true,
    },
    shippingMethod: {
      type: checkoutShippingMethodSnapshotSchema,
      default: null,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for shipping fee.',
      },
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
    inventoryReserved: {
      type: Boolean,
      default: true,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastValidatedAt: {
      type: Date,
      default: Date.now,
      required: true,
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

// Performance and uniqueness indexing
checkoutSessionSchema.index({ userId: 1, status: 1 });

export const CheckoutSession = model<ICheckoutSession>('CheckoutSession', checkoutSessionSchema);

