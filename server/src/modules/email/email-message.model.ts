import mongoose, { Schema, Document } from 'mongoose';
import { EMAIL_STATUS, EMAIL_PROVIDER } from './email.constants.js';

export interface IEmailMessage extends Document {
  userId?: mongoose.Types.ObjectId;
  recipient: string;
  template: string;
  subject: string;
  status: string;
  provider: string;
  providerMessageId?: string;
  deduplicationKey?: string;
  attemptCount: number;
  metadata?: Record<string, any>;
  sentAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailMessageSchema = new Schema<IEmailMessage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  recipient: { type: String, required: true },
  template: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: Object.values(EMAIL_STATUS), default: EMAIL_STATUS.PENDING },
  provider: { type: String, enum: Object.values(EMAIL_PROVIDER) },
  providerMessageId: { type: String },
  deduplicationKey: { type: String },
  attemptCount: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed },
  sentAt: { type: Date },
  failedAt: { type: Date }
}, { timestamps: true });

emailMessageSchema.index({ deduplicationKey: 1 }, { unique: true, sparse: true });
emailMessageSchema.index({ userId: 1, createdAt: -1 });
emailMessageSchema.index({ status: 1, createdAt: -1 });
emailMessageSchema.index({ template: 1, createdAt: -1 });
emailMessageSchema.index({ recipient: 1, createdAt: -1 });

export const EmailMessage = mongoose.model<IEmailMessage>('EmailMessage', emailMessageSchema);
