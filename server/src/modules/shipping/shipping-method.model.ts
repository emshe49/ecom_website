import { Schema, model, Document, Types } from 'mongoose';
import {
  SHIPPING_METHOD_TYPE,
  ShippingMethodType,
} from './shipping.constants.js';

export interface IShippingEligibility {
  minimumOrderAmount?: number | null;
  maximumOrderAmount?: number | null;
  allowedCountries?: string[];
  allowedRegions?: string[];
}

export interface IShippingMethod extends Document {
  _id: Types.ObjectId;
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
  eligibility?: IShippingEligibility;
  createdAt: Date;
  updatedAt: Date;
}

const shippingEligibilitySchema = new Schema<IShippingEligibility>(
  {
    minimumOrderAmount: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (v: number | null) => v === null || Number.isInteger(v),
        message: '{VALUE} is not an integer value for minimumOrderAmount.',
      },
    },
    maximumOrderAmount: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (v: number | null) => v === null || Number.isInteger(v),
        message: '{VALUE} is not an integer value for maximumOrderAmount.',
      },
    },
    allowedCountries: {
      type: [String],
      default: [],
    },
    allowedRegions: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const shippingMethodSchema = new Schema<IShippingMethod>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(SHIPPING_METHOD_TYPE),
      default: SHIPPING_METHOD_TYPE.STANDARD,
      required: true,
    },
    baseFee: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for baseFee.',
      },
    },
    freeAboveSubtotal: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (v: number | null) => v === null || Number.isInteger(v),
        message: '{VALUE} is not an integer value for freeAboveSubtotal.',
      },
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'PKR',
    },
    estimatedMinDays: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for estimatedMinDays.',
      },
    },
    estimatedMaxDays: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for estimatedMaxDays.',
      },
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    displayOrder: {
      type: Number,
      default: null,
    },
    eligibility: {
      type: shippingEligibilitySchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

shippingMethodSchema.index({ active: 1, sortOrder: 1, createdAt: -1 });

export const ShippingMethod = model<IShippingMethod>(
  'ShippingMethod',
  shippingMethodSchema
);
