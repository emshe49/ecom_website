import { Schema, model, Document } from 'mongoose';

export interface ICounter extends Document {
  key: string;
  sequence: number;
  updatedAt: Date;
}

const counterSchema = new Schema<ICounter>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sequence: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Counter = model<ICounter>('Counter', counterSchema);
