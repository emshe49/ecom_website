import { IAddress } from '../addresses/address.model.js';
import { ICheckoutAddressSnapshot, ICheckoutSession } from './checkout.model.js';
import { CheckoutAddressSnapshotDTO, CheckoutItemSnapshotDTO, CheckoutSessionDTO } from './checkout.types.js';

export function toAddressSnapshot(address: IAddress): ICheckoutAddressSnapshot {
  return {
    sourceAddressId: address._id,
    fullName: address.fullName,
    phone: address.phone,
    country: address.country,
    stateProvince: address.stateProvince,
    city: address.city,
    area: address.area || null,
    postalCode: address.postalCode || null,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || null,
  };
}

export function toCheckoutSessionDTO(
  session: ICheckoutSession,
  hasPriceChanges = false
): CheckoutSessionDTO {
  const now = Date.now();
  const expiresAtTime = new Date(session.expiresAt).getTime();
  const remainingSeconds = Math.max(0, Math.floor((expiresAtTime - now) / 1000));

  const items: CheckoutItemSnapshotDTO[] = session.items.map((item) => ({
    productId: item.productId.toString(),
    variantId: item.variantId.toString(),
    productName: item.productName,
    productSlug: item.productSlug,
    sku: item.sku,
    variantAttributes: item.variantAttributes.map((attr) => ({
      name: attr.name,
      value: attr.value,
    })),
    primaryImage: item.primaryImage || null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  }));

  const shippingAddress: CheckoutAddressSnapshotDTO = {
    sourceAddressId: session.shippingAddress.sourceAddressId.toString(),
    fullName: session.shippingAddress.fullName,
    phone: session.shippingAddress.phone,
    country: session.shippingAddress.country,
    stateProvince: session.shippingAddress.stateProvince,
    city: session.shippingAddress.city,
    area: session.shippingAddress.area || null,
    postalCode: session.shippingAddress.postalCode || null,
    addressLine1: session.shippingAddress.addressLine1,
    addressLine2: session.shippingAddress.addressLine2 || null,
  };

  const billingAddress: CheckoutAddressSnapshotDTO = {
    sourceAddressId: session.billingAddress.sourceAddressId.toString(),
    fullName: session.billingAddress.fullName,
    phone: session.billingAddress.phone,
    country: session.billingAddress.country,
    stateProvince: session.billingAddress.stateProvince,
    city: session.billingAddress.city,
    area: session.billingAddress.area || null,
    postalCode: session.billingAddress.postalCode || null,
    addressLine1: session.billingAddress.addressLine1,
    addressLine2: session.billingAddress.addressLine2 || null,
  };

  return {
    id: session._id.toString(),
    userId: session.userId.toString(),
    status: session.status,
    items,
    shippingAddress,
    billingAddress,
    shippingMethod: session.shippingMethod
      ? {
          shippingMethodId: session.shippingMethod.shippingMethodId?.toString(),
          code: session.shippingMethod.code,
          name: session.shippingMethod.name,
          fee: session.shippingMethod.fee,
          currency: session.shippingMethod.currency,
          estimatedMinDays: session.shippingMethod.estimatedMinDays,
          estimatedMaxDays: session.shippingMethod.estimatedMaxDays,
        }
      : null,
    shippingFee: session.shippingFee ?? 0,
    subtotal: session.subtotal,
    total: session.total ?? session.subtotal + (session.shippingFee ?? 0),
    currency: session.currency,
    expiresAt: session.expiresAt.toISOString(),
    remainingSeconds,
    lastValidatedAt: session.lastValidatedAt.toISOString(),
    ...(hasPriceChanges ? { hasPriceChanges: true } : {}),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}
