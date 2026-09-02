import { Schema, model, Document } from 'mongoose';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_PRIORITY,
  TICKET_STATUS,
} from './support.constants.js';
import { ISupportTicket } from './support.types.js';

export interface ISupportTicketDocument extends ISupportTicket, Document {}

const supportTicketSchema = new Schema<ISupportTicketDocument>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 160,
    },
    category: {
      type: String,
      required: true,
      enum: TICKET_CATEGORIES,
      index: true,
    },
    priority: {
      type: String,
      required: true,
      enum: TICKET_PRIORITIES,
      default: TICKET_PRIORITY.NORMAL,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: TICKET_STATUSES,
      default: TICKET_STATUS.OPEN,
      index: true,
    },
    relatedOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    relatedPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    relatedShipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      default: null,
    },
    relatedReturnId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    relatedRefundId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    lastCustomerMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastStaffMessageAt: {
      type: Date,
      default: null,
    },
    customerUnreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    staffUnreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    resolutionSummary: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performant queue filtering and customer listing
supportTicketSchema.index({ customerId: 1, updatedAt: -1 });
supportTicketSchema.index({ customerId: 1, status: 1, updatedAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, lastMessageAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1, lastMessageAt: -1 });

export const SupportTicket = model<ISupportTicketDocument>(
  'SupportTicket',
  supportTicketSchema
);
