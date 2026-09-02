import mongoose, { Schema, Document } from 'mongoose';

export interface AuditChainStateDocument extends Document {
  chainId: string;
  latestHash: string;
  sequenceNumber: number;
  updatedAt: Date;
}

const auditChainStateSchema = new Schema<AuditChainStateDocument>(
  {
    chainId: {
      type: String,
      required: true,
      unique: true,
      default: 'global_chain',
      trim: true,
    },
    latestHash: {
      type: String,
      required: true,
      trim: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
      default: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    collection: 'audit_chain_state',
  }
);

export const AuditChainState = mongoose.model<AuditChainStateDocument>(
  'AuditChainState',
  auditChainStateSchema
);
