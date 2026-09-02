import mongoose, { Schema, Document } from 'mongoose';
import { IAuditLog } from './audit.types.js';
import {
  AUDIT_CATEGORY,
  ACTOR_TYPE,
  AUDIT_OUTCOME,
} from './audit.constants.js';

export interface AuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: Object.values(AUDIT_CATEGORY),
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    actorType: {
      type: String,
      required: true,
      enum: Object.values(ACTOR_TYPE),
      default: ACTOR_TYPE.SYSTEM,
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorRoleSnapshot: {
      type: String,
      default: null,
      trim: true,
    },
    targetType: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    targetId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    targetDisplay: {
      type: String,
      default: null,
      trim: true,
    },
    outcome: {
      type: String,
      required: true,
      enum: Object.values(AUDIT_OUTCOME),
      default: AUDIT_OUTCOME.SUCCESS,
      index: true,
    },
    failureCode: {
      type: String,
      default: null,
      trim: true,
    },
    requestId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
      trim: true,
    },
    userAgent: {
      type: String,
      default: null,
      trim: true,
      maxlength: 512,
    },
    httpMethod: {
      type: String,
      default: null,
      trim: true,
    },
    route: {
      type: String,
      default: null,
      trim: true,
    },
    changedFields: {
      type: [String],
      default: null,
    },
    before: {
      type: Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    recordHash: {
      type: String,
      required: true,
      trim: true,
    },
    previousHash: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: 'audit_logs',
  }
);

// Indexes for high-performance administrative queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });
auditLogSchema.index({ targetDisplay: 'text' });

export const AuditLog = mongoose.model<AuditLogDocument>('AuditLog', auditLogSchema);
