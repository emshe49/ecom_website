import { Schema, model, Document, Types } from 'mongoose';
import {
  PAYMENT_PROVIDER,
  WEBHOOK_STATUS,
  PaymentProvider,
  WebhookProcessingStatus,
} from './payment.constants.js';

export interface IPaymentWebhookEventDocument extends Document {
  _id: Types.ObjectId;
  provider: PaymentProvider;
  providerEventId: string;
  eventType: string;
  paymentId?: Types.ObjectId;
  attemptId?: Types.ObjectId;
  processingStatus: WebhookProcessingStatus;
  receivedAt: Date;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentWebhookEventSchema = new Schema<IPaymentWebhookEventDocument>(
  {
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      required: true,
      index: true,
    },
    providerEventId: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentAttempt',
    },
    processingStatus: {
      type: String,
      enum: Object.values(WEBHOOK_STATUS),
      default: WEBHOOK_STATUS.RECEIVED,
      required: true,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    processedAt: {
      type: Date,
    },
    error: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentWebhookEventSchema.index(
  { provider: 1, providerEventId: 1 },
  { unique: true }
);

export const PaymentWebhookEvent = model<IPaymentWebhookEventDocument>(
  'PaymentWebhookEvent',
  paymentWebhookEventSchema
);
