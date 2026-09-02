import { Types } from 'mongoose';
import { Order } from '../orders/order.model.js';
import { Payment } from '../payments/payment.model.js';
import { Shipment } from '../shipping/shipment.model.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export interface ValidatedReferences {
  orderId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
  shipmentId?: Types.ObjectId;
  returnId?: Types.ObjectId;
  refundId?: Types.ObjectId;
}

export class SupportReferenceService {
  /**
   * Validates ownership and cross-entity consistency for related entities.
   */
  async validateReferences(
    customerId: string | Types.ObjectId,
    references: {
      relatedOrderId?: string;
      relatedPaymentId?: string;
      relatedShipmentId?: string;
      relatedReturnId?: string;
      relatedRefundId?: string;
    }
  ): Promise<ValidatedReferences> {
    const custIdStr = customerId.toString();
    const result: ValidatedReferences = {};

    let matchedOrderId: string | null = null;

    // 1. Validate Order
    if (references.relatedOrderId) {
      if (!Types.ObjectId.isValid(references.relatedOrderId)) {
        throw new AppError(
          'Invalid relatedOrderId provided.',
          400,
          ErrorCodes.ERR_SUPPORT_INVALID_RELATED_ENTITY
        );
      }

      const order = await Order.findById(references.relatedOrderId);
      if (!order) {
        throw new AppError(
          'Referenced Order not found.',
          404,
          ErrorCodes.ERR_SUPPORT_INVALID_RELATED_ENTITY
        );
      }

      if (order.userId.toString() !== custIdStr) {
        throw new AppError(
          'Referenced Order does not belong to you.',
          403,
          ErrorCodes.ERR_SUPPORT_RELATED_ENTITY_FORBIDDEN
        );
      }

      result.orderId = order._id;
      matchedOrderId = order._id.toString();
    }

    // 2. Validate Payment
    if (references.relatedPaymentId) {
      if (!Types.ObjectId.isValid(references.relatedPaymentId)) {
        throw new AppError(
          'Invalid relatedPaymentId provided.',
          400,
          ErrorCodes.ERR_SUPPORT_INVALID_RELATED_ENTITY
        );
      }

      const payment = await Payment.findById(references.relatedPaymentId);
      if (!payment) {
        throw new AppError(
          'Referenced Payment not found.',
          404,
          ErrorCodes.ERR_SUPPORT_INVALID_RELATED_ENTITY
        );
      }

      if (payment.userId.toString() !== custIdStr) {
        throw new AppError(
          'Referenced Payment does not belong to you.',
          403,
          ErrorCodes.ERR_SUPPORT_RELATED_ENTITY_FORBIDDEN
        );
      }

      // Check cross-reference consistency with order
      const paymentOrderId = payment.orderId.toString();
      if (matchedOrderId && paymentOrderId !== matchedOrderId) {
        throw new AppError(
          'Referenced Payment does not belong to the referenced Order.',
          400,
          ErrorCodes.ERR_SUPPORT_RELATED_ENTITY_MISMATCH
        );
      }

      result.paymentId = payment._id;
      if (!result.orderId) {
        result.orderId = payment.orderId;
        matchedOrderId = paymentOrderId;
      }
    }

    // 3. Validate Shipment
    if (references.relatedShipmentId) {
      if (!Types.ObjectId.isValid(references.relatedShipmentId)) {
        throw new AppError(
          'Invalid relatedShipmentId provided.',
          400,
          ErrorCodes.ERR_SUPPORT_INVALID_RELATED_ENTITY
        );
      }

      const shipment = await Shipment.findById(references.relatedShipmentId);
      if (!shipment) {
        throw new AppError(
          'Referenced Shipment not found.',
          404,
          ErrorCodes.ERR_SUPPORT_INVALID_RELATED_ENTITY
        );
      }

      if (shipment.userId.toString() !== custIdStr) {
        throw new AppError(
          'Referenced Shipment does not belong to you.',
          403,
          ErrorCodes.ERR_SUPPORT_RELATED_ENTITY_FORBIDDEN
        );
      }

      // Check cross-reference consistency with order
      const shipmentOrderId = shipment.orderId.toString();
      if (matchedOrderId && shipmentOrderId !== matchedOrderId) {
        throw new AppError(
          'Referenced Shipment does not belong to the referenced Order.',
          400,
          ErrorCodes.ERR_SUPPORT_RELATED_ENTITY_MISMATCH
        );
      }

      result.shipmentId = shipment._id;
      if (!result.orderId) {
        result.orderId = shipment.orderId;
      }
    }

    // 4. Return and Refund if supplied as valid ObjectIds
    if (references.relatedReturnId && Types.ObjectId.isValid(references.relatedReturnId)) {
      result.returnId = new Types.ObjectId(references.relatedReturnId);
    }

    if (references.relatedRefundId && Types.ObjectId.isValid(references.relatedRefundId)) {
      result.refundId = new Types.ObjectId(references.relatedRefundId);
    }

    return result;
  }
}

export const supportReferenceService = new SupportReferenceService();
