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
import { AppError } from '../../../shared/errors/app-error.js';
import { ErrorCodes } from '../../../shared/errors/error-codes.js';

export class CodPaymentProvider implements IPaymentProvider {
  readonly providerName: PaymentProvider = PAYMENT_PROVIDER.COD;

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const providerPaymentId = `cod_${params.attemptId}`;
    const providerReference = `COD-REF-${params.paymentNumber}`;

    return {
      providerPaymentId,
      providerReference,
      status: PAYMENT_ATTEMPT_STATUS.PENDING,
    };
  }

  async verifyWebhook(
    _rawBody: Buffer | string,
    _headers: Record<string, string | string[] | undefined>
  ): Promise<WebhookVerificationResult> {
    return { isValid: false, error: 'Webhooks are not supported for Cash on Delivery' };
  }

  async parseWebhook(
    _body: any,
    _headers: Record<string, string | string[] | undefined>
  ): Promise<ParsedWebhookEvent> {
    throw AppError.badRequest(
      'Webhooks are not supported for Cash on Delivery',
      ErrorCodes.ERR_PAYMENT_PROVIDER_UNAVAILABLE
    );
  }

  async getPaymentStatus(
    _providerPaymentId: string
  ): Promise<ProviderPaymentStatusResult> {
    return {
      status: PAYMENT_ATTEMPT_STATUS.PENDING,
    };
  }
}
