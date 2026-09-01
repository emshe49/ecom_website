import { IPaymentDocument } from './payment.model.js';
import { IPaymentAttemptDocument } from './payment-attempt.model.js';
import {
  PaymentDTO,
  PaymentAttemptDTO,
  AdminPaymentListItemDTO,
  AdminPaymentDetailDTO,
} from './payment.types.js';

export const paymentMapper = {
  toAttemptDTO(attempt: IPaymentAttemptDocument): PaymentAttemptDTO {
    return {
      id: attempt._id.toString(),
      attemptNumber: attempt.attemptNumber,
      provider: attempt.provider,
      method: attempt.method,
      status: attempt.status,
      amount: attempt.amount,
      currency: attempt.currency,
      providerTransactionId: attempt.providerTransactionId,
      providerReference: attempt.providerReference,
      failureCode: attempt.failureCode,
      failureMessage: attempt.failureMessage,
      initiatedAt: attempt.initiatedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString(),
    };
  },

  toPaymentDTO(
    payment: IPaymentDocument,
    attempts?: IPaymentAttemptDocument[]
  ): PaymentDTO {
    return {
      id: payment._id.toString(),
      paymentNumber: payment.paymentNumber,
      orderId: payment.orderId.toString(),
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      provider: payment.provider,
      providerTransactionId: payment.providerTransactionId,
      paidAt: payment.paidAt?.toISOString(),
      failedAt: payment.failedAt?.toISOString(),
      cancelledAt: payment.cancelledAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      attempts: attempts ? attempts.map(this.toAttemptDTO) : undefined,
    };
  },

  toAdminListItemDTO(
    payment: IPaymentDocument,
    orderNumber?: string,
    customer?: { email: string; firstName: string; lastName: string }
  ): AdminPaymentListItemDTO {
    return {
      id: payment._id.toString(),
      paymentNumber: payment.paymentNumber,
      orderId: payment.orderId.toString(),
      orderNumber,
      userId: payment.userId.toString(),
      customerEmail: customer?.email,
      customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : undefined,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      provider: payment.provider,
      status: payment.status,
      providerTransactionId: payment.providerTransactionId,
      paidAt: payment.paidAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
    };
  },

  toAdminDetailDTO(
    payment: IPaymentDocument,
    attempts: IPaymentAttemptDocument[],
    orderNumber?: string,
    customer?: { id: string; email: string; firstName: string; lastName: string }
  ): AdminPaymentDetailDTO {
    const base = this.toPaymentDTO(payment, attempts);
    return {
      ...base,
      orderNumber,
      customer,
      attempts: attempts.map(this.toAttemptDTO),
    };
  },
};
