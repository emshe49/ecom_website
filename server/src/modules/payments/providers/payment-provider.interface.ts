import { PaymentMethod, PaymentProvider, PaymentAttemptStatus } from '../payment.constants.js';

export interface CreatePaymentParams {
  paymentId: string;
  paymentNumber: string;
  attemptId: string;
  attemptNumber: number;
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  providerTransactionId?: string;
  providerReference?: string;
  checkoutUrl?: string;
  clientToken?: string;
  status: PaymentAttemptStatus;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
}

export interface ParsedWebhookEvent {
  providerEventId: string;
  eventType: string;
  providerPaymentId?: string;
  providerTransactionId?: string;
  attemptId?: string;
  paymentId?: string;
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  failureCode?: string;
  failureMessage?: string;
}

export interface ProviderPaymentStatusResult {
  status: PaymentAttemptStatus;
  providerTransactionId?: string;
  providerReference?: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface IPaymentProvider {
  readonly providerName: PaymentProvider;

  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;

  verifyWebhook(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult>;

  parseWebhook(
    body: any,
    headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent>;

  getPaymentStatus(
    providerPaymentId: string
  ): Promise<ProviderPaymentStatusResult>;
}
