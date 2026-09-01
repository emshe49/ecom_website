import { IShippingProvider } from './shipping-provider.interface.js';
import { ManualShippingProvider } from './manual-shipping.provider.js';
import { CARRIER_TYPE } from '../shipping.constants.js';

class ShippingProviderRegistry {
  private providers = new Map<string, IShippingProvider>();

  constructor() {
    this.register(new ManualShippingProvider());
  }

  register(provider: IShippingProvider): void {
    this.providers.set(provider.carrierCode.toUpperCase(), provider);
  }

  getProvider(carrier: string): IShippingProvider {
    const key = carrier.toUpperCase();
    const provider = this.providers.get(key);
    if (provider) {
      return provider;
    }
    // Default fallback to manual provider
    return this.providers.get(CARRIER_TYPE.MANUAL)!;
  }
}

export const shippingProviderRegistry = new ShippingProviderRegistry();
