import { IPaymentProvider } from './payment-provider.interface.js';
import { TestPaymentProvider } from './test-payment.provider.js';
import { CodPaymentProvider } from './cod-payment.provider.js';
import {
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
  PaymentMethod,
  PaymentProvider,
} from '../payment.constants.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ErrorCodes } from '../../../shared/errors/error-codes.js';

class PaymentProviderRegistry {
  private providers: Map<PaymentProvider, IPaymentProvider> = new Map();

  constructor() {
    this.register(new TestPaymentProvider());
    this.register(new CodPaymentProvider());
  }

  register(provider: IPaymentProvider): void {
    this.providers.set(provider.providerName, provider);
  }

  getProvider(name: PaymentProvider): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw AppError.badRequest(
        `Payment provider '${name}' is not configured or unavailable.`,
        ErrorCodes.ERR_PAYMENT_PROVIDER_UNAVAILABLE
      );
    }
    return provider;
  }

  resolveProviderForMethod(method: PaymentMethod): IPaymentProvider {
    if (method === PAYMENT_METHOD.CASH_ON_DELIVERY) {
      return this.getProvider(PAYMENT_PROVIDER.COD);
    }
    if (method === PAYMENT_METHOD.ONLINE) {
      return this.getProvider(PAYMENT_PROVIDER.TEST);
    }
    throw AppError.badRequest(
      `Unsupported payment method '${method}'.`,
      ErrorCodes.ERR_PAYMENT_INVALID_METHOD
    );
  }
}

export const providerRegistry = new PaymentProviderRegistry();
