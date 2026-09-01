import { IShippingMethod } from './shipping-method.model.js';
import { IShipment } from './shipment.model.js';
import {
  ShippingMethodDTO,
  EligibleShippingMethodDTO,
  CustomerShipmentDTO,
  AdminShipmentDetailDTO,
  AdminShipmentSummaryDTO,
} from './shipping.types.js';
import { shipmentStatusService } from './shipment-status.service.js';

export const shippingMapper = {
  toShippingMethodDTO(method: IShippingMethod): ShippingMethodDTO {
    return {
      id: method._id.toString(),
      code: method.code,
      name: method.name,
      description: method.description || null,
      type: method.type,
      baseFee: method.baseFee,
      freeAboveSubtotal: method.freeAboveSubtotal ?? null,
      currency: method.currency,
      estimatedMinDays: method.estimatedMinDays,
      estimatedMaxDays: method.estimatedMaxDays,
      active: method.active,
      sortOrder: method.sortOrder ?? method.displayOrder ?? 0,
      displayOrder: method.displayOrder ?? method.sortOrder ?? 0,
      eligibility: {
        minimumOrderAmount: method.eligibility?.minimumOrderAmount ?? null,
        maximumOrderAmount: method.eligibility?.maximumOrderAmount ?? null,
        allowedCountries: method.eligibility?.allowedCountries || [],
        allowedRegions: method.eligibility?.allowedRegions || [],
      },
      createdAt: method.createdAt.toISOString(),
      updatedAt: method.updatedAt.toISOString(),
    };
  },

  toEligibleShippingMethodDTO(
    method: IShippingMethod,
    calculatedFee?: number
  ): EligibleShippingMethodDTO {
    return {
      id: method._id.toString(),
      code: method.code,
      name: method.name,
      description: method.description || null,
      type: method.type,
      fee: calculatedFee !== undefined ? calculatedFee : method.baseFee,
      currency: method.currency,
      estimatedMinDays: method.estimatedMinDays,
      estimatedMaxDays: method.estimatedMaxDays,
    };
  },

  toCustomerShipmentDTO(shipment: IShipment): CustomerShipmentDTO {
    return {
      id: shipment._id.toString(),
      shipmentNumber: shipment.shipmentNumber,
      orderId: shipment.orderId.toString(),
      orderNumber: shipment.orderNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      carrierName: shipment.carrierName || shipment.carrier || null,
      service: shipment.service || null,
      trackingNumber: shipment.trackingNumber || null,
      trackingUrl: shipment.trackingUrl || null,
      shippingAddress: shipment.shippingAddress,
      items: shipment.items,
      shippingMethod: {
        code: shipment.shippingMethod.code,
        name: shipment.shippingMethod.name,
        fee: shipment.shippingMethod.fee,
        currency: shipment.shippingMethod.currency,
        estimatedMinDays: shipment.shippingMethod.estimatedMinDays,
        estimatedMaxDays: shipment.shippingMethod.estimatedMaxDays,
      },
      shippedAt: shipment.shippedAt ? shipment.shippedAt.toISOString() : null,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt
        ? shipment.estimatedDeliveryAt.toISOString()
        : null,
      deliveredAt: shipment.deliveredAt
        ? shipment.deliveredAt.toISOString()
        : null,
      statusHistory: shipment.statusHistory.map((h) => ({
        status: h.status,
        note: h.note || null,
        changedAt: h.changedAt.toISOString(),
      })),
    };
  },

  toAdminShipmentDetailDTO(shipment: IShipment): AdminShipmentDetailDTO {
    const allowedTransitions =
      shipmentStatusService.getAllowedTransitions(shipment.status);

    return {
      id: shipment._id.toString(),
      shipmentNumber: shipment.shipmentNumber,
      orderId: shipment.orderId.toString(),
      orderNumber: shipment.orderNumber,
      userId: shipment.userId.toString(),
      status: shipment.status,
      carrier: shipment.carrier,
      carrierName: shipment.carrierName || shipment.carrier || null,
      service: shipment.service || null,
      trackingNumber: shipment.trackingNumber || null,
      trackingUrl: shipment.trackingUrl || null,
      internalNotes: shipment.internalNotes || null,
      customerSnapshot: shipment.customerSnapshot,
      shippingAddress: shipment.shippingAddress,
      items: shipment.items,
      shippingMethod: {
        shippingMethodId: shipment.shippingMethod.shippingMethodId?.toString(),
        code: shipment.shippingMethod.code,
        name: shipment.shippingMethod.name,
        fee: shipment.shippingMethod.fee,
        currency: shipment.shippingMethod.currency,
        estimatedMinDays: shipment.shippingMethod.estimatedMinDays,
        estimatedMaxDays: shipment.shippingMethod.estimatedMaxDays,
      },
      shippedAt: shipment.shippedAt ? shipment.shippedAt.toISOString() : null,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt
        ? shipment.estimatedDeliveryAt.toISOString()
        : null,
      deliveredAt: shipment.deliveredAt
        ? shipment.deliveredAt.toISOString()
        : null,
      failedAt: shipment.failedAt ? shipment.failedAt.toISOString() : null,
      cancelledAt: shipment.cancelledAt
        ? shipment.cancelledAt.toISOString()
        : null,
      statusHistory: shipment.statusHistory.map((h) => ({
        status: h.status,
        changedBy: h.changedBy ? h.changedBy.toString() : null,
        note: h.note || null,
        changedAt: h.changedAt.toISOString(),
      })),
      allowedTransitions: [...allowedTransitions],
      createdBy: shipment.createdBy.toString(),
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString(),
    };
  },

  toAdminShipmentSummaryDTO(shipment: IShipment): AdminShipmentSummaryDTO {
    return {
      id: shipment._id.toString(),
      shipmentNumber: shipment.shipmentNumber,
      orderId: shipment.orderId.toString(),
      orderNumber: shipment.orderNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber || null,
      customer: {
        fullName: `${shipment.customerSnapshot.firstName} ${shipment.customerSnapshot.lastName}`.trim(),
        email: shipment.customerSnapshot.email,
      },
      destinationCity: shipment.shippingAddress.city,
      itemCount: shipment.items.reduce((acc, item) => acc + item.quantity, 0),
      shippedAt: shipment.shippedAt ? shipment.shippedAt.toISOString() : null,
      deliveredAt: shipment.deliveredAt
        ? shipment.deliveredAt.toISOString()
        : null,
      createdAt: shipment.createdAt.toISOString(),
    };
  },
};
