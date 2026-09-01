import crypto from 'crypto';
import {
  IPaymentProvider,
  CreatePaymentParams,
  CreatePaymentResult,
  WebhookVerificationResult,
  ParsedWebhookEvent,
  ProviderPaymentStatusResult,
} from './payment-provider.interface.js';
import {
  PAYMENT_PROVIDER,
  PAYMENT_ATTEMPT_STATUS,
  PaymentProvider,
} from '../payment.constants.js';
import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ErrorCodes } from '../../../shared/errors/error-codes.js';

export class TestPaymentProvider implements IPaymentProvider {
  readonly providerName: PaymentProvider = PAYMENT_PROVIDER.TEST;

  private getWebhookSecret(): string {
    return process.env.TEST_PAYMENT_WEBHOOK_SECRET || 'test_payment_webhook_secret_key_2026';
  }

  private ensureAllowed(): void {
    if (env.NODE_ENV === 'production' && process.env.ENABLE_TEST_PAYMENT_PROVIDER !== 'true') {
      throw AppError.badRequest(
        'Test payment provider is disabled in production.',
        ErrorCodes.ERR_PAYMENT_PROVIDER_UNAVAILABLE
      );
    }
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    this.ensureAllowed();

    const providerPaymentId = `test_pay_${params.attemptId}`;
    const providerReference = `TEST-REF-${params.paymentNumber}-${params.attemptNumber}`;
    const clientToken = `test_tok_${crypto.randomBytes(16).toString('hex')}`;
    const checkoutUrl = `${env.CLIENT_URL}/payment/result?orderId=${params.orderId}&attemptId=${params.attemptId}`;

    return {
      providerPaymentId,
      providerReference,
      clientToken,
      checkoutUrl,
      status: PAYMENT_ATTEMPT_STATUS.PENDING,
    };
  }

  async verifyWebhook(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult> {
    this.ensureAllowed();

    const signature = (headers['x-test-signature'] || headers['x-webhook-signature']) as string | undefined;
    if (!signature) {
      return { isValid: false, error: 'Missing webhook signature header' };
    }

    const secret = this.getWebhookSecret();
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      const match = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
      return { isValid: match, error: match ? undefined : 'Signature verification failed' };
    } catch {
      return { isValid: false, error: 'Malformed signature header' };
    }
  }

  async parseWebhook(
    body: any,
    _headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent> {
    this.ensureAllowed();

    const eventType = body.eventType || body.event;
    const providerEventId = body.providerEventId || body.id || `evt_${Date.now()}`;
    const providerPaymentId = body.providerPaymentId || body.data?.providerPaymentId;
    const attemptId = body.metadata?.attemptId || body.attemptId;
    const paymentId = body.metadata?.paymentId || body.paymentId;

    let status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED' = 'FAILED';
    if (eventType === 'payment.succeeded' || eventType === 'PAYMENT_SUCCEEDED') {
      status = 'SUCCEEDED';
    } else if (eventType === 'payment.cancelled' || eventType === 'PAYMENT_CANCELLED') {
      status = 'CANCELLED';
    }

    return {
      providerEventId,
      eventType,
      providerPaymentId,
      providerTransactionId: body.providerTransactionId || `txn_test_${Date.now()}`,
      attemptId,
      paymentId,
      status,
      failureCode: body.failureCode,
      failureMessage: body.failureMessage,
    };
  }

  async getPaymentStatus(
    providerPaymentId: string
  ): Promise<ProviderPaymentStatusResult> {
    this.ensureAllowed();

    return {
      status: PAYMENT_ATTEMPT_STATUS.SUCCEEDED,
      providerTransactionId: `txn_${providerPaymentId}`,
      providerReference: `RECON-${providerPaymentId}`,
    };
  }

  /**
   * Helper for tests to generate a valid test webhook signature.
   */
  generateTestSignature(payload: string | Buffer): string {
    const secret = this.getWebhookSecret();
    const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    return crypto.createHmac('sha256', secret).update(buf).digest('hex');
  }
}
