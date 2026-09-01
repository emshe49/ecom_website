import { Schema, model, Document, Types } from 'mongoose';
import {
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
  PAYMENT_ATTEMPT_STATUS,
  PaymentMethod,
  PaymentProvider,
  PaymentAttemptStatus,
} from './payment.constants.js';

export interface IPaymentAttemptDocument extends Document {
  _id: Types.ObjectId;
  paymentId: Types.ObjectId;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  attemptNumber: number;
  provider: PaymentProvider;
  method: PaymentMethod;
  status: PaymentAttemptStatus;
  amount: number;
  currency: string;
  providerPaymentId?: string;
  providerTransactionId?: string;
  providerReference?: string;
  checkoutUrl?: string;
  clientToken?: string;
  failureCode?: string;
  failureMessage?: string;
  initiatedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentAttemptSchema = new Schema<IPaymentAttemptDocument>(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      required: true,
    },
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_ATTEMPT_STATUS),
      default: PAYMENT_ATTEMPT_STATUS.PENDING,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
    },
    providerTransactionId: {
      type: String,
      trim: true,
    },
    providerReference: {
      type: String,
      trim: true,
    },
    checkoutUrl: {
      type: String,
      trim: true,
    },
    clientToken: {
      type: String,
      trim: true,
    },
    failureCode: {
      type: String,
      trim: true,
    },
    failureMessage: {
      type: String,
      trim: true,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

paymentAttemptSchema.index({ paymentId: 1, createdAt: -1 });
paymentAttemptSchema.index({ orderId: 1, createdAt: -1 });
paymentAttemptSchema.index(
  { provider: 1, providerTransactionId: 1 },
  { sparse: true }
);

export const PaymentAttempt = model<IPaymentAttemptDocument>(
  'PaymentAttempt',
  paymentAttemptSchema
);
