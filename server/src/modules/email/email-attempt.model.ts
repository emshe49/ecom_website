import mongoose, { Schema, Document } from 'mongoose';
import { EMAIL_STATUS, EMAIL_PROVIDER } from './email.constants.js';

export interface IEmailAttempt extends Document {
  emailMessageId: mongoose.Types.ObjectId;
  attemptNumber: number;
  provider: string;
  status: string;
  providerMessageId?: string;
  failureCode?: string;
  failureMessage?: string;
  startedAt: Date;
  finishedAt?: Date;
}

const emailAttemptSchema = new Schema<IEmailAttempt>({
  emailMessageId: { type: Schema.Types.ObjectId, ref: 'EmailMessage', required: true },
  attemptNumber: { type: Number, required: true },
  provider: { type: String, enum: Object.values(EMAIL_PROVIDER), required: true },
  status: { type: String, enum: Object.values(EMAIL_STATUS), required: true },
  providerMessageId: { type: String },
  failureCode: { type: String },
  failureMessage: { type: String },
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date }
}, { timestamps: true });

emailAttemptSchema.index({ emailMessageId: 1, attemptNumber: 1 }, { unique: true });
emailAttemptSchema.index({ status: 1, createdAt: -1 });

export const EmailAttempt = mongoose.model<IEmailAttempt>('EmailAttempt', emailAttemptSchema);
