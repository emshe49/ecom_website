import { Schema, model, Document, Types } from 'mongoose';

export interface IAuthSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  revokedAt?: Date;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isActiveSession(): boolean;
}

const authSessionSchema = new Schema<IAuthSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB automatically removes document when expiresAt timestamp is reached
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

authSessionSchema.methods.isActiveSession = function (): boolean {
  const isNotExpired = this.expiresAt.getTime() > Date.now();
  const isNotRevoked = !this.revokedAt;
  return isNotExpired && isNotRevoked;
};

export const AuthSession = model<IAuthSession>('AuthSession', authSessionSchema);
