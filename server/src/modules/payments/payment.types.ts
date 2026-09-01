import { Types } from 'mongoose';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PaymentAttemptStatus,
  WebhookProcessingStatus,
} from './payment.constants.js';

export interface IPayment {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  paymentNumber: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerTransactionId?: string;
  providerReference?: string;
  paidAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentAttempt {
  _id: Types.ObjectId;
  paymentId: Types.ObjectId;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  attemptNumber: number;
  provider: PaymentProvider;
  method: PaymentMethod;
  status: PaymentAttemptStatus;
  amount: number;
  currency: string;
  providerPaymentId?: string;
  providerTransactionId?: string;
  providerReference?: string;
  checkoutUrl?: string;
  clientToken?: string;
  failureCode?: string;
  failureMessage?: string;
  initiatedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentWebhookEvent {
  _id: Types.ObjectId;
  provider: PaymentProvider;
  providerEventId: string;
  eventType: string;
  paymentId?: Types.ObjectId;
  attemptId?: Types.ObjectId;
  processingStatus: WebhookProcessingStatus;
  receivedAt: Date;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Client Response DTOs (safe, no secrets or sensitive data)
export interface PaymentAttemptDTO {
  id: string;
  attemptNumber: number;
  provider: PaymentProvider;
  method: PaymentMethod;
  status: PaymentAttemptStatus;
  amount: number;
  currency: string;
  providerTransactionId?: string;
  providerReference?: string;
  failureCode?: string;
  failureMessage?: string;
  initiatedAt: string;
  completedAt?: string;
}

export interface PaymentDTO {
  id: string;
  paymentNumber: string;
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerTransactionId?: string;
  paidAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  attempts?: PaymentAttemptDTO[];
}

export interface InitiatePaymentResultDTO {
  payment: PaymentDTO;
  attempt: PaymentAttemptDTO;
  checkoutUrl?: string;
  clientToken?: string;
}

export interface AdminPaymentListItemDTO {
  id: string;
  paymentNumber: string;
  orderId: string;
  orderNumber?: string;
  userId: string;
  customerEmail?: string;
  customerName?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerTransactionId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface AdminPaymentDetailDTO extends PaymentDTO {
  orderNumber?: string;
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  attempts: PaymentAttemptDTO[];
}
