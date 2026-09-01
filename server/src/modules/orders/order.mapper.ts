import { IOrder } from './order.model.js';
import {
  OrderSummaryDTO,
  OrderDetailDTO,
  AdminOrderDetailDTO,
  OrderItemDTO,
  AddressSnapshotDTO,
  StatusHistoryDTO,
} from './order.types.js';
import { orderStatusService } from './order-status.service.js';

export const orderMapper = {
  toOrderItemDTO(item: IOrder['items'][0]): OrderItemDTO {
    return {
      productId: item.productId.toString(),
      variantId: item.variantId.toString(),
      productName: item.productName,
      productSlug: item.productSlug,
      sku: item.sku,
      variantAttributes: item.variantAttributes,
      primaryImage: item.primaryImage || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      couponDiscountAmount: item.couponDiscountAmount ?? 0,
      promotionDiscountAmount: item.promotionDiscountAmount ?? 0,
      discountAmount: item.discountAmount ?? 0,
      finalLineTotal: item.finalLineTotal ?? (item.lineTotal - (item.discountAmount ?? 0)),
    };
  },

  toAddressDTO(addr: IOrder['shippingAddress']): AddressSnapshotDTO {
    return {
      sourceAddressId: addr.sourceAddressId.toString(),
      fullName: addr.fullName,
      phone: addr.phone,
      country: addr.country,
      stateProvince: addr.stateProvince,
      city: addr.city,
      area: addr.area || null,
      postalCode: addr.postalCode || null,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || null,
    };
  },

  toStatusHistoryDTO(h: IOrder['statusHistory'][0]): StatusHistoryDTO {
    return {
      status: h.status,
      changedBy: h.changedBy ? h.changedBy.toString() : null,
      note: h.note || null,
      changedAt: h.changedAt.toISOString(),
    };
  },

  toOrderSummaryDTO(order: IOrder): OrderSummaryDTO {
    const totalQuantity = order.items.reduce((sum, it) => sum + it.quantity, 0);
    const primaryImages = order.items
      .map((it) => it.primaryImage)
      .filter((img): img is string => typeof img === 'string' && img.length > 0);

    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      itemCount: order.items.length,
      totalQuantity,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount ?? 0,
      shippingFee: order.shippingFee ?? 0,
      total: order.total,
      currency: order.currency,
      placedAt: order.placedAt.toISOString(),
      primaryImages,
    };
  },

  toOrderDetailDTO(order: IOrder): OrderDetailDTO {
    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      items: order.items.map(this.toOrderItemDTO),
      shippingAddress: this.toAddressDTO(order.shippingAddress),
      billingAddress: this.toAddressDTO(order.billingAddress),
      shippingMethod: order.shippingMethod
        ? {
            shippingMethodId: order.shippingMethod.shippingMethodId?.toString(),
            code: order.shippingMethod.code,
            name: order.shippingMethod.name,
            fee: order.shippingMethod.fee,
            currency: order.shippingMethod.currency,
            estimatedMinDays: order.shippingMethod.estimatedMinDays,
            estimatedMaxDays: order.shippingMethod.estimatedMaxDays,
          }
        : null,
      shippingFee: order.shippingFee ?? 0,
      subtotal: order.subtotal,
      couponDiscountAmount: order.couponDiscountAmount ?? 0,
      promotionDiscountAmount: order.promotionDiscountAmount ?? 0,
      discountAmount: order.discountAmount ?? 0,
      coupon: order.coupon
        ? {
            couponId: order.coupon.couponId.toString(),
            code: order.coupon.code,
            name: order.coupon.name,
            discountType: order.coupon.discountType,
            discountValue: order.coupon.discountValue,
            discountAmount: order.coupon.discountAmount,
          }
        : null,
      promotion: order.promotion
        ? {
            promotionId: order.promotion.promotionId.toString(),
            name: order.promotion.name,
            discountType: order.promotion.discountType,
            discountValue: order.promotion.discountValue,
            discountAmount: order.promotion.discountAmount,
          }
        : null,
      total: order.total,
      currency: order.currency,
      customerNotes: order.customerNotes || null,
      statusHistory: order.statusHistory.map(this.toStatusHistoryDTO),
      canCancel: orderStatusService.canCustomerCancelOrder(order),
      placedAt: order.placedAt.toISOString(),
      cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
      completedAt: order.completedAt ? order.completedAt.toISOString() : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  },

  toAdminOrderDetailDTO(order: IOrder): AdminOrderDetailDTO {
    return {
      ...this.toOrderDetailDTO(order),
      customer: {
        userId: order.customerSnapshot.userId.toString(),
        firstName: order.customerSnapshot.firstName,
        lastName: order.customerSnapshot.lastName,
        email: order.customerSnapshot.email,
        phone: order.customerSnapshot.phone || null,
      },
      internalNotes: order.internalNotes || null,
      allowedTransitions: orderStatusService.getAllowedOrderTransitions(order.status),
      checkoutSessionId: order.checkoutSessionId.toString(),
    };
  },
};
