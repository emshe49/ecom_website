import { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/utils/logger.js';
import { Address } from '../addresses/address.model.js';
import { Cart } from '../cart/cart.model.js';
import { Category } from '../catalog/categories/category.model.js';
import { Brand } from '../catalog/brands/brand.model.js';
import { Product } from '../catalog/products/product.model.js';
import { ProductVariant } from '../catalog/products/product-variant.model.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { REFERENCE_TYPE } from '../inventory/inventory.constants.js';
import { ShippingMethod } from '../shipping/shipping-method.model.js';
import { shippingQuoteService } from '../shipping/shipping-quote.service.js';
import { CHECKOUT_STATUS, DEFAULT_CHECKOUT_TTL_MINUTES } from './checkout.constants.js';
import {
  CheckoutSession,
  ICheckoutItemSnapshot,
  ICheckoutSession,
  ICheckoutShippingMethodSnapshot,
} from './checkout.model.js';
import { toAddressSnapshot, toCheckoutSessionDTO } from './checkout.mapper.js';
import { CheckoutSessionDTO, CreateCheckoutInputDTO } from './checkout.types.js';

export class CheckoutService {
  /**
   * Creates a new Checkout Session with atomic multi-item inventory reservation.
   * Cancels/releases any existing active checkout session for the customer.
   */
  async createCheckoutSession(
    userId: string,
    input: CreateCheckoutInputDTO
  ): Promise<CheckoutSessionDTO> {
    const uId = new Types.ObjectId(userId);

    // 1. Cancel and release any existing active checkout session for this user
    const existingActive = await CheckoutSession.findOne({
      userId: uId,
      status: CHECKOUT_STATUS.ACTIVE,
    });
    if (existingActive) {
      await this.cancelCheckoutSession(existingActive);
    }

    // 2. Load and validate Cart
    const cart = await Cart.findOne({ userId: uId });
    if (!cart || cart.items.length === 0) {
      throw AppError.conflict(
        'Cannot initiate checkout with an empty cart.',
        ErrorCodes.ERR_CHECKOUT_EMPTY_CART
      );
    }

    // 3. Validate Addresses & Ownership
    const shippingAddress = await Address.findOne({
      _id: new Types.ObjectId(input.shippingAddressId),
      userId: uId,
    });
    if (!shippingAddress) {
      throw AppError.badRequest(
        'Invalid or unauthorized shipping address selected.',
        ErrorCodes.ERR_CHECKOUT_INVALID_ADDRESS
      );
    }

    let billingAddress = shippingAddress;
    if (!input.billingSameAsShipping) {
      if (!input.billingAddressId) {
        throw AppError.badRequest(
          'Billing address ID is required when billingSameAsShipping is false.',
          ErrorCodes.ERR_CHECKOUT_INVALID_ADDRESS
        );
      }
      const foundBilling = await Address.findOne({
        _id: new Types.ObjectId(input.billingAddressId),
        userId: uId,
      });
      if (!foundBilling) {
        throw AppError.badRequest(
          'Invalid or unauthorized billing address selected.',
          ErrorCodes.ERR_CHECKOUT_INVALID_ADDRESS
        );
      }
      billingAddress = foundBilling;
    }

    // 4. Batch-load Variants, Products, Categories, and Brands
    const variantIds = cart.items.map((i) => i.variantId);
    const variants = await ProductVariant.find({ _id: { $in: variantIds } });
    const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));

    const productIds = variants.map((v) => v.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const categoryIds = products.map((p) => p.categoryId);
    const categories = await Category.find({ _id: { $in: categoryIds } });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

    const brandIds = products.map((p) => p.brandId);
    const brands = await Brand.find({ _id: { $in: brandIds } });
    const brandMap = new Map(brands.map((b) => [b._id.toString(), b]));

    // 5. Validate visibility, active state, and calculate live authoritative prices
    const itemSnapshots: ICheckoutItemSnapshot[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const variant = variantMap.get(item.variantId.toString());
      if (!variant || !variant.isActive) {
        throw AppError.badRequest(
          'One or more items in your cart are no longer available.',
          ErrorCodes.ERR_CHECKOUT_ITEM_UNAVAILABLE
        );
      }

      const product = productMap.get(variant.productId.toString());
      if (!product || product.status !== 'ACTIVE') {
        throw AppError.badRequest(
          'One or more items in your cart are no longer available.',
          ErrorCodes.ERR_CHECKOUT_ITEM_UNAVAILABLE
        );
      }

      const category = categoryMap.get(product.categoryId.toString());
      if (!category || !category.isActive) {
        throw AppError.badRequest(
          'One or more items belong to an inactive category.',
          ErrorCodes.ERR_CHECKOUT_ITEM_UNAVAILABLE
        );
      }

      if (product.brandId) {
        const brand = brandMap.get(product.brandId.toString());
        if (!brand || !brand.isActive) {
          throw AppError.badRequest(
            'One or more items belong to an inactive brand.',
            ErrorCodes.ERR_CHECKOUT_ITEM_UNAVAILABLE
          );
        }
      }

      // Authoritative live price from variant
      const unitPrice = variant.price;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      const primaryImg =
        product.images?.find((img) => img.isPrimary)?.url ||
        product.images?.[0]?.url ||
        null;

      itemSnapshots.push({
        productId: product._id,
        variantId: variant._id,
        productName: product.name,
        productSlug: product.slug,
        sku: variant.sku,
        variantAttributes: variant.attributes.map((a) => ({
          name: a.name,
          value: a.value,
        })),
        primaryImage: primaryImg,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      });
    }

    // 6. Pre-allocate CheckoutSession ObjectId for audit correlation
    const checkoutSessionId = new Types.ObjectId();
    const reservedSoFar: Array<{ variantId: Types.ObjectId; quantity: number }> = [];

    // 7. Atomically reserve inventory for each item (with compensating rollback)
    for (const snapshot of itemSnapshots) {
      try {
        await inventoryService.reserveStock(
          snapshot.variantId,
          snapshot.quantity,
          checkoutSessionId.toString(),
          REFERENCE_TYPE.CHECKOUT,
          'Checkout session inventory reservation'
        );
        reservedSoFar.push({
          variantId: snapshot.variantId,
          quantity: snapshot.quantity,
        });
      } catch {
        // Compensating rollback for all variants reserved so far
        logger.warn(


          `Checkout reservation failed for variant ${snapshot.variantId.toString()}. Rolling back ${reservedSoFar.length} item reservations.`
        );
        for (const reserved of reservedSoFar) {
          try {
            await inventoryService.releaseStock(
              reserved.variantId,
              reserved.quantity,
              checkoutSessionId.toString(),
              REFERENCE_TYPE.CHECKOUT,
              'Checkout reservation failure rollback'
            );
          } catch (rollbackErr) {
            logger.error(
              `Critical error during reservation rollback for variant ${reserved.variantId.toString()}: ${rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)}`
            );
          }
        }

        throw AppError.badRequest(
          'Insufficient available stock for one or more items to complete checkout.',
          ErrorCodes.ERR_CHECKOUT_INSUFFICIENT_STOCK
        );
      }
    }

    // 8. Resolve and snapshot Shipping Method
    let shippingMethodSnapshot: ICheckoutShippingMethodSnapshot;

    if (input.shippingMethodId) {
      if (!Types.ObjectId.isValid(input.shippingMethodId)) {
        throw AppError.badRequest('Invalid shipping method ID format.', ErrorCodes.BAD_REQUEST);
      }

      const method = await ShippingMethod.findById(input.shippingMethodId);
      if (!method) {
        throw AppError.notFound('Shipping method not found.', ErrorCodes.ERR_SHIPPING_METHOD_NOT_FOUND);
      }

      if (!method.active) {
        throw AppError.badRequest('Selected shipping method is no longer active.', ErrorCodes.ERR_SHIPPING_METHOD_INACTIVE);
      }

      const isEligible = shippingQuoteService.isMethodEligible(
        method,
        subtotal,
        shippingAddress.country,
        shippingAddress.stateProvince,
        shippingAddress.city
      );

      if (!isEligible) {
        throw AppError.badRequest('Selected shipping method is not eligible for this order.', ErrorCodes.ERR_SHIPPING_METHOD_NOT_ELIGIBLE);
      }

      const calculatedFee = shippingQuoteService.calculateMethodFee(method, subtotal);

      shippingMethodSnapshot = {
        shippingMethodId: method._id,
        code: method.code,
        name: method.name,
        fee: calculatedFee,
        currency: method.currency,
        estimatedMinDays: method.estimatedMinDays,
        estimatedMaxDays: method.estimatedMaxDays,
      };
    } else {
      // Fallback: Pick first eligible active shipping method or default standard
      const activeMethods = await ShippingMethod.find({ active: true }).sort({ sortOrder: 1, baseFee: 1 });
      const eligibleMethod = activeMethods.find((m) =>
        shippingQuoteService.isMethodEligible(
          m,
          subtotal,
          shippingAddress.country,
          shippingAddress.stateProvince,
          shippingAddress.city
        )
      );

      if (eligibleMethod) {
        const calculatedFee = shippingQuoteService.calculateMethodFee(eligibleMethod, subtotal);
        shippingMethodSnapshot = {
          shippingMethodId: eligibleMethod._id,
          code: eligibleMethod.code,
          name: eligibleMethod.name,
          fee: calculatedFee,
          currency: eligibleMethod.currency,
          estimatedMinDays: eligibleMethod.estimatedMinDays,
          estimatedMaxDays: eligibleMethod.estimatedMaxDays,
        };
      } else {
        // Fallback default snapshot
        shippingMethodSnapshot = {
          code: 'STANDARD',
          name: 'Standard Delivery',
          fee: 0,
          currency: env.STORE_CURRENCY || 'PKR',
          estimatedMinDays: 3,
          estimatedMaxDays: 5,
        };
      }
    }

    const shippingFee = shippingMethodSnapshot.fee;
    const total = subtotal + shippingFee;

    // 9. Create and persist CheckoutSession
    const ttlMinutes = env.CHECKOUT_SESSION_TTL_MINUTES || DEFAULT_CHECKOUT_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const session = await CheckoutSession.create({
      _id: checkoutSessionId,
      userId: uId,
      status: CHECKOUT_STATUS.ACTIVE,
      items: itemSnapshots,
      shippingAddress: toAddressSnapshot(shippingAddress),
      billingAddress: toAddressSnapshot(billingAddress),
      shippingMethod: shippingMethodSnapshot,
      shippingFee,
      subtotal,
      total,
      currency: env.STORE_CURRENCY || 'PKR',
      inventoryReserved: true,
      expiresAt,
      lastValidatedAt: new Date(),
    });

    return toCheckoutSessionDTO(session);
  }

  /**
   * Retrieves the current active checkout session for a customer.
   * If expired, automatically transitions to EXPIRED, releases stock, and returns 410.
   */
  async getActiveCheckout(userId: string): Promise<CheckoutSessionDTO> {
    const uId = new Types.ObjectId(userId);
    const session = await CheckoutSession.findOne({
      userId: uId,
      status: CHECKOUT_STATUS.ACTIVE,
    });

    if (!session) {
      throw AppError.notFound(
        'No active checkout session found.',
        ErrorCodes.ERR_CHECKOUT_NOT_FOUND
      );
    }

    // Check expiration
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await this.expireCheckoutSession(session);
      throw new AppError(
        'Checkout session has expired. Please initiate checkout again.',
        410,
        ErrorCodes.ERR_CHECKOUT_EXPIRED
      );
    }

    return toCheckoutSessionDTO(session);
  }

  /**
   * Revalidates an active checkout session before order placement.
   * Checks expiration, live catalog active states, and updates price snapshots if modified.
   */
  async revalidateCheckout(userId: string): Promise<CheckoutSessionDTO> {
    const uId = new Types.ObjectId(userId);
    const session = await CheckoutSession.findOne({
      userId: uId,
      status: CHECKOUT_STATUS.ACTIVE,
    });

    if (!session) {
      throw AppError.notFound(
        'No active checkout session found.',
        ErrorCodes.ERR_CHECKOUT_NOT_FOUND
      );
    }

    // Check expiration
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await this.expireCheckoutSession(session);
      throw new AppError(
        'Checkout session has expired. Please initiate checkout again.',
        410,
        ErrorCodes.ERR_CHECKOUT_EXPIRED
      );
    }

    // Revalidate Products, Variants, Categories, Brands
    const variantIds = session.items.map((i) => i.variantId);
    const variants = await ProductVariant.find({ _id: { $in: variantIds } });
    const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));

    const productIds = session.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const categoryIds = products.map((p) => p.categoryId);
    const categories = await Category.find({ _id: { $in: categoryIds } });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

    const brandIds = products.map((p) => p.brandId).filter(Boolean);
    const brands = await Brand.find({ _id: { $in: brandIds } });
    const brandMap = new Map(brands.map((b) => [b._id.toString(), b]));

    let hasInvalidation = false;
    let hasPriceChanges = false;
    let recalculatedSubtotal = 0;

    for (const item of session.items) {
      const variant = variantMap.get(item.variantId.toString());
      const product = productMap.get(item.productId.toString());
      const category = product ? categoryMap.get(product.categoryId.toString()) : null;
      const brand = product && product.brandId ? brandMap.get(product.brandId.toString()) : null;

      if (
        !variant ||
        !variant.isActive ||
        !product ||
        product.status !== 'ACTIVE' ||
        !category ||
        !category.isActive ||
        (product.brandId && (!brand || !brand.isActive))
      ) {
        hasInvalidation = true;
        break;
      }

      if (variant.price !== item.unitPrice) {
        hasPriceChanges = true;
        item.unitPrice = variant.price;
        item.lineTotal = variant.price * item.quantity;
      }

      recalculatedSubtotal += item.lineTotal;
    }

    if (hasInvalidation) {
      await this.invalidateCheckoutSession(session);
      throw AppError.badRequest(
        'One or more items in your checkout are no longer available.',
        ErrorCodes.ERR_CHECKOUT_ITEM_UNAVAILABLE
      );
    }

    if (hasPriceChanges) {
      session.subtotal = recalculatedSubtotal;
    }

    // Revalidate Shipping Method
    let hasShippingChanges = false;
    if (session.shippingMethod?.shippingMethodId) {
      const method = await ShippingMethod.findById(session.shippingMethod.shippingMethodId);
      if (!method || !method.active) {
        await this.invalidateCheckoutSession(session);
        throw AppError.badRequest(
          'Selected shipping method is no longer available.',
          ErrorCodes.ERR_SHIPPING_METHOD_NOT_ELIGIBLE
        );
      }

      const isEligible = shippingQuoteService.isMethodEligible(
        method,
        session.subtotal,
        session.shippingAddress.country,
        session.shippingAddress.stateProvince,
        session.shippingAddress.city
      );

      if (!isEligible) {
        await this.invalidateCheckoutSession(session);
        throw AppError.badRequest(
          'Selected shipping method is no longer eligible for this order total.',
          ErrorCodes.ERR_SHIPPING_METHOD_NOT_ELIGIBLE
        );
      }

      const currentFee = shippingQuoteService.calculateMethodFee(method, session.subtotal);
      if (currentFee !== session.shippingFee) {
        session.shippingFee = currentFee;
        session.shippingMethod.fee = currentFee;
        hasShippingChanges = true;
      }
    }

    session.total = session.subtotal + (session.shippingFee || 0);
    session.lastValidatedAt = new Date();
    await session.save();

    return toCheckoutSessionDTO(session, hasPriceChanges || hasShippingChanges);
  }

  /**
   * Cancels the active checkout session for a customer and releases all reserved inventory.
   * Safe against double-release and idempotent.
   */
  async cancelCheckout(userId: string): Promise<{ message: string }> {
    const uId = new Types.ObjectId(userId);
    const session = await CheckoutSession.findOne({
      userId: uId,
      status: CHECKOUT_STATUS.ACTIVE,
    });

    if (!session) {
      return { message: 'No active checkout session to cancel.' };
    }

    await this.cancelCheckoutSession(session);
    return { message: 'Checkout session cancelled successfully.' };
  }

  /**
   * Internal helper: Cancels a session and releases stock.
   */
  private async cancelCheckoutSession(session: ICheckoutSession): Promise<void> {
    const updated = await CheckoutSession.findOneAndUpdate(
      {
        _id: session._id,
        status: CHECKOUT_STATUS.ACTIVE,
        inventoryReserved: true,
      },
      {
        $set: {
          status: CHECKOUT_STATUS.CANCELLED,
          inventoryReserved: false,
          cancelledAt: new Date(),
        },
      },
      { new: true }
    );

    if (updated) {
      for (const item of session.items) {
        try {
          await inventoryService.releaseStock(
            item.variantId,
            item.quantity,
            session._id.toString(),
            REFERENCE_TYPE.CHECKOUT,
            'Checkout session cancelled by customer'
          );
        } catch (err) {
          logger.error(
            `Error releasing stock for variant ${item.variantId.toString()} on cancel: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  }

  /**
   * Internal helper: Expires a session and releases stock.
   */
  private async expireCheckoutSession(session: ICheckoutSession): Promise<void> {
    const updated = await CheckoutSession.findOneAndUpdate(
      {
        _id: session._id,
        status: CHECKOUT_STATUS.ACTIVE,
        inventoryReserved: true,
      },
      {
        $set: {
          status: CHECKOUT_STATUS.EXPIRED,
          inventoryReserved: false,
        },
      },
      { new: true }
    );

    if (updated) {
      for (const item of session.items) {
        try {
          await inventoryService.releaseStock(
            item.variantId,
            item.quantity,
            session._id.toString(),
            REFERENCE_TYPE.CHECKOUT,
            'Checkout session expired'
          );
        } catch (err) {
          logger.error(
            `Error releasing stock for variant ${item.variantId.toString()} on expiry: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  }

  /**
   * Internal helper: Invalidates a session and releases stock.
   */
  private async invalidateCheckoutSession(session: ICheckoutSession): Promise<void> {
    const updated = await CheckoutSession.findOneAndUpdate(
      {
        _id: session._id,
        status: CHECKOUT_STATUS.ACTIVE,
        inventoryReserved: true,
      },
      {
        $set: {
          status: CHECKOUT_STATUS.INVALIDATED,
          inventoryReserved: false,
        },
      },
      { new: true }
    );

    if (updated) {
      for (const item of session.items) {
        try {
          await inventoryService.releaseStock(
            item.variantId,
            item.quantity,
            session._id.toString(),
            REFERENCE_TYPE.CHECKOUT,
            'Checkout session invalidated due to product/variant deactivation'
          );
        } catch (err) {
          logger.error(
            `Error releasing stock for variant ${item.variantId.toString()} on invalidation: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  }
}


export const checkoutService = new CheckoutService();
