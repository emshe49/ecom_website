import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  TRANSACTION_TYPE,
  TransactionType,
  REFERENCE_TYPE,
  ReferenceType,
} from './inventory.constants.js';

export interface IInventoryTransaction extends Document {
  _id: Types.ObjectId;
  variantId: Types.ObjectId;
  type: TransactionType;
  quantity: number;
  previousOnHand: number;
  newOnHand: number;
  previousReserved: number;
  newReserved: number;
  reason: string;
  referenceType: ReferenceType | null;
  referenceId: string | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPE),
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for quantity.',
      },
    },
    previousOnHand: {
      type: Number,
      required: true,
      min: 0,
    },
    newOnHand: {
      type: Number,
      required: true,
      min: 0,
    },
    previousReserved: {
      type: Number,
      required: true,
      min: 0,
    },
    newReserved: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    referenceType: {
      type: String,
      enum: Object.values(REFERENCE_TYPE),
      default: null,
    },
    referenceId: {
      type: String,
      default: null,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only
  }
);

inventoryTransactionSchema.index({ variantId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });
inventoryTransactionSchema.index({ createdBy: 1, createdAt: -1 });

export const InventoryTransaction = mongoose.model<IInventoryTransaction>(
  'InventoryTransaction',
  inventoryTransactionSchema
);
