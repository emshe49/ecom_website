import mongoose, { Document, Schema, Types } from 'mongoose';
import { DEFAULT_LOW_STOCK_THRESHOLD } from './inventory.constants.js';

export interface IInventory extends Document {
  _id: Types.ObjectId;
  variantId: Types.ObjectId;
  onHand: number;
  reserved: number;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
      unique: true,
      index: true,
    },
    onHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for onHand.',
      },
    },
    reserved: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for reserved.',
      },
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      default: DEFAULT_LOW_STOCK_THRESHOLD,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for lowStockThreshold.',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

inventorySchema.index({ onHand: 1 });
inventorySchema.index({ lowStockThreshold: 1 });
inventorySchema.index({ updatedAt: -1 });

export const Inventory = mongoose.model<IInventory>(
  'Inventory',
  inventorySchema
);
