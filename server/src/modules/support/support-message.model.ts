import { Schema, model, Document } from 'mongoose';
import {
  SENDER_TYPE,
  MESSAGE_TYPE,
  SUPPORT_CONFIG,
} from './support.constants.js';
import { ISupportMessage } from './support.types.js';

export interface ISupportMessageDocument extends ISupportMessage, Document {}

const supportMessageSchema = new Schema<ISupportMessageDocument>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'SupportTicket',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      required: true,
      enum: Object.values(SENDER_TYPE),
    },
    messageType: {
      type: String,
      required: true,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.MESSAGE,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: SUPPORT_CONFIG.MIN_MESSAGE_LENGTH,
      maxlength: SUPPORT_CONFIG.MAX_MESSAGE_LENGTH,
    },
  },
  {
    timestamps: true,
  }
);

// Order messages chronologically
supportMessageSchema.index({ ticketId: 1, createdAt: 1 });

export const SupportMessage = model<ISupportMessageDocument>(
  'SupportMessage',
  supportMessageSchema
);
