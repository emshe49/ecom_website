import { Types } from 'mongoose';
import { ShippingMethod, IShippingMethod } from './shipping-method.model.js';
import { Address } from '../addresses/address.model.js';
import { cartService } from '../cart/cart.service.js';
import {
  ShippingQuoteInput,
  ShippingQuoteResponseDTO,
  EligibleShippingMethodDTO,
} from './shipping.types.js';
import { shippingMapper } from './shipping.mapper.js';
import { SHIPPING_METHOD_TYPE } from './shipping.constants.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export const shippingQuoteService = {
  /**
   * Calculates eligible shipping methods and quote fees for a customer's active cart and destination address.
   */
  async getQuote(
    userId: string,
    input: ShippingQuoteInput
  ): Promise<ShippingQuoteResponseDTO> {
    const userObjId = new Types.ObjectId(userId);

    // 1. Verify address exists and belongs to the customer
    const address = await Address.findOne({
      _id: new Types.ObjectId(input.shippingAddressId),
      userId: userObjId,
    });

    if (!address) {
      throw AppError.notFound(
        'Shipping address not found or does not belong to customer.',
        ErrorCodes.ERR_ADDRESS_NOT_FOUND
      );
    }

    // 2. Fetch customer's active cart to calculate authoritative subtotal
    const cart = await cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw AppError.badRequest(
        'Cart is empty. Cannot generate shipping quote.',
        ErrorCodes.ERR_CHECKOUT_EMPTY_CART
      );
    }

    const subtotal = cart.subtotal || 0;
    const currency = cart.currency || 'PKR';

    // 3. Query all active shipping methods
    const activeMethods = await ShippingMethod.find({ active: true }).sort({
      sortOrder: 1,
      baseFee: 1,
    });

    // 4. Filter methods by eligibility
    const eligibleMethods: EligibleShippingMethodDTO[] = [];

    for (const method of activeMethods) {
      if (this.isMethodEligible(method, subtotal, address.country, address.stateProvince, address.city)) {
        const calculatedFee = this.calculateMethodFee(method, subtotal);
        eligibleMethods.push(
          shippingMapper.toEligibleShippingMethodDTO(method, calculatedFee)
        );
      }
    }

    return {
      destination: {
        country: address.country,
        city: address.city,
        stateProvince: address.stateProvince,
      },
      subtotal,
      currency,
      methods: eligibleMethods,
    };
  },

  /**
   * Evaluates if a shipping method is eligible for a given subtotal and destination.
   */
  isMethodEligible(
    method: IShippingMethod,
    subtotal: number,
    country: string,
    stateProvince?: string,
    _city?: string
  ): boolean {
    if (!method.active) {
      return false;
    }

    const eligibility = method.eligibility;
    if (!eligibility) {
      return true;
    }

    // Min order amount
    if (
      eligibility.minimumOrderAmount !== null &&
      eligibility.minimumOrderAmount !== undefined &&
      subtotal < eligibility.minimumOrderAmount
    ) {
      return false;
    }

    // Max order amount
    if (
      eligibility.maximumOrderAmount !== null &&
      eligibility.maximumOrderAmount !== undefined &&
      subtotal > eligibility.maximumOrderAmount
    ) {
      return false;
    }

    // Allowed countries
    if (
      eligibility.allowedCountries &&
      eligibility.allowedCountries.length > 0
    ) {
      const normalizedCountry = country.trim().toUpperCase();
      const countryMatches = eligibility.allowedCountries.some(
        (c) => c.trim().toUpperCase() === normalizedCountry
      );
      if (!countryMatches) {
        return false;
      }
    }

    // Allowed regions / provinces
    if (
      eligibility.allowedRegions &&
      eligibility.allowedRegions.length > 0 &&
      stateProvince
    ) {
      const normalizedRegion = stateProvince.trim().toLowerCase();
      const regionMatches = eligibility.allowedRegions.some(
        (r) => r.trim().toLowerCase() === normalizedRegion
      );
      if (!regionMatches) {
        return false;
      }
    }

    return true;
  },

  /**
   * Calculates the authoritative fee for a shipping method.
   */
  calculateMethodFee(method: IShippingMethod, subtotal: number): number {
    if (method.type === SHIPPING_METHOD_TYPE.FREE_SHIPPING) {
      return 0;
    }
    if (
      method.freeAboveSubtotal !== null &&
      method.freeAboveSubtotal !== undefined &&
      subtotal >= method.freeAboveSubtotal
    ) {
      return 0;
    }
    return method.baseFee;
  },
};
