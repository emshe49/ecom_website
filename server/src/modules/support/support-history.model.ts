import { Schema, model, Document } from 'mongoose';
import { HISTORY_ACTION } from './support.constants.js';
import { ISupportTicketHistory } from './support.types.js';

export interface ISupportTicketHistoryDocument
  extends ISupportTicketHistory,
    Document {}

const supportTicketHistorySchema = new Schema<ISupportTicketHistoryDocument>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'SupportTicket',
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorType: {
      type: String,
      required: true,
      enum: ['CUSTOMER', 'STAFF', 'SYSTEM'],
    },
    action: {
      type: String,
      required: true,
      enum: Object.values(HISTORY_ACTION),
    },
    fromValue: {
      type: String,
      default: null,
    },
    toValue: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

supportTicketHistorySchema.index({ ticketId: 1, createdAt: 1 });

export const SupportTicketHistory = model<ISupportTicketHistoryDocument>(
  'SupportTicketHistory',
  supportTicketHistorySchema
);
