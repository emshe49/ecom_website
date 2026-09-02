import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailPreference extends Document {
  userId: mongoose.Types.ObjectId;
  orders: boolean;
  payments: boolean;
  shipping: boolean;
  reviews: boolean;
  returns: boolean;
  refunds: boolean;
  marketing: boolean;
}

const emailPreferenceSchema = new Schema<IEmailPreference>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  orders: { type: Boolean, default: true },
  payments: { type: Boolean, default: true },
  shipping: { type: Boolean, default: true },
  reviews: { type: Boolean, default: true },
  returns: { type: Boolean, default: true },
  refunds: { type: Boolean, default: true },
  marketing: { type: Boolean, default: false }
}, { timestamps: true });

export const EmailPreference = mongoose.model<IEmailPreference>('EmailPreference', emailPreferenceSchema);
