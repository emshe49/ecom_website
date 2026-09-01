import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  NotificationType,
  NotificationCategory,
} from './notification.constants.js';

export interface NotificationDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  readAt: Date | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  deduplicationKey: string | null;
  sourceModule: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(NOTIFICATION_CATEGORY),
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    readAt: {
      type: Date,
      default: null,
    },
    entityType: {
      type: String,
      default: null,
      trim: true,
    },
    entityId: {
      type: String,
      default: null,
      trim: true,
    },
    actionUrl: {
      type: String,
      default: null,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    deduplicationKey: {
      type: String,
      trim: true,
    },
    sourceModule: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index(
  { deduplicationKey: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { deduplicationKey: { $type: 'string' } },
  }
);

export const Notification = mongoose.model<NotificationDocument>(
  'Notification',
  notificationSchema
);
