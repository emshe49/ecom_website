import mongoose, { Document, Schema, Types } from 'mongoose';

export interface NotificationPreferenceDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  orders: boolean;
  payments: boolean;
  shipping: boolean;
  reviews: boolean;
  returns: boolean;
  refunds: boolean;
  promotions: boolean;
  inventory: boolean;
  system: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<NotificationPreferenceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    orders: {
      type: Boolean,
      default: true,
    },
    payments: {
      type: Boolean,
      default: true,
    },
    shipping: {
      type: Boolean,
      default: true,
    },
    reviews: {
      type: Boolean,
      default: true,
    },
    returns: {
      type: Boolean,
      default: true,
    },
    refunds: {
      type: Boolean,
      default: true,
    },
    promotions: {
      type: Boolean,
      default: false,
    },
    inventory: {
      type: Boolean,
      default: true,
    },
    system: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const NotificationPreference =
  mongoose.model<NotificationPreferenceDocument>(
    'NotificationPreference',
    notificationPreferenceSchema
  );
