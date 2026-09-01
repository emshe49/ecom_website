import { Types, ClientSession } from 'mongoose';
import {
  SHIPMENT_STATUS,
  ShipmentStatus,
  ALLOWED_SHIPMENT_TRANSITIONS,
} from './shipping.constants.js';
import { IShipment } from './shipment.model.js';
import { Order } from '../orders/order.model.js';
import {
  ORDER_STATUS,
  FULFILLMENT_STATUS,
} from '../orders/order.constants.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/utils/logger.js';

export const shipmentStatusService = {
  /**
   * Checks if a transition between two shipment statuses is allowed.
   */
  canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
    const allowed = ALLOWED_SHIPMENT_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  },

  /**
   * Returns list of allowed next statuses from current status.
   */
  getAllowedTransitions(currentStatus: ShipmentStatus): readonly ShipmentStatus[] {
    return ALLOWED_SHIPMENT_TRANSITIONS[currentStatus] || [];
  },

  /**
   * Throws an AppError if the requested transition is illegal.
   */
  validateTransition(from: ShipmentStatus, to: ShipmentStatus): void {
    if (!this.canTransition(from, to)) {
      throw AppError.badRequest(
        `Invalid shipment status transition from '${from}' to '${to}'. Allowed next statuses: [${this.getAllowedTransitions(
          from
        ).join(', ')}]`,
        ErrorCodes.ERR_SHIPMENT_INVALID_STATUS_TRANSITION
      );
    }
  },

  /**
   * Synchronizes Order state and fulfillment status when Shipment status changes.
   */
  async syncOrderOnShipmentStatusChange(
    shipment: IShipment,
    newStatus: ShipmentStatus,
    adminUserId?: string | null,
    session?: ClientSession
  ): Promise<void> {
    const order = await Order.findById(shipment.orderId).session(session || null);
    if (!order) {
      logger.warn(
        `Shipment ${shipment.shipmentNumber} sync: Order ${shipment.orderId} not found.`
      );
      return;
    }

    const changedByObjId = adminUserId ? new Types.ObjectId(adminUserId) : null;
    let orderUpdated = false;

    switch (newStatus) {
      case SHIPMENT_STATUS.READY_TO_SHIP: {
        order.fulfillmentStatus = FULFILLMENT_STATUS.READY_TO_SHIP;
        if (
          order.status === ORDER_STATUS.PLACED ||
          order.status === ORDER_STATUS.CONFIRMED ||
          order.status === ORDER_STATUS.PROCESSING
        ) {
          order.status = ORDER_STATUS.READY_TO_SHIP;
          order.statusHistory.push({
            status: ORDER_STATUS.READY_TO_SHIP,
            changedBy: changedByObjId,
            note: `Shipment ${shipment.shipmentNumber} prepared and marked ready to ship.`,
            changedAt: new Date(),
          });
        }
        orderUpdated = true;
        break;
      }

      case SHIPMENT_STATUS.SHIPPED: {
        order.fulfillmentStatus = FULFILLMENT_STATUS.SHIPPED;
        if (order.status !== ORDER_STATUS.SHIPPED && order.status !== ORDER_STATUS.DELIVERED) {
          order.status = ORDER_STATUS.SHIPPED;
          const trackingInfo = shipment.trackingNumber
            ? ` (Carrier: ${shipment.carrier}, Tracking: ${shipment.trackingNumber})`
            : ` (Carrier: ${shipment.carrier})`;

          order.statusHistory.push({
            status: ORDER_STATUS.SHIPPED,
            changedBy: changedByObjId,
            note: `Shipment ${shipment.shipmentNumber} dispatched${trackingInfo}.`,
            changedAt: new Date(),
          });
        }
        orderUpdated = true;
        break;
      }

      case SHIPMENT_STATUS.DELIVERED: {
        order.fulfillmentStatus = FULFILLMENT_STATUS.DELIVERED;
        if (order.status !== ORDER_STATUS.DELIVERED) {
          order.status = ORDER_STATUS.DELIVERED;
          order.completedAt = new Date();
          order.statusHistory.push({
            status: ORDER_STATUS.DELIVERED,
            changedBy: changedByObjId,
            note: `Shipment ${shipment.shipmentNumber} confirmed delivered to customer.`,
            changedAt: new Date(),
          });
        }
        orderUpdated = true;
        break;
      }

      case SHIPMENT_STATUS.CANCELLED: {
        if (order.fulfillmentStatus === FULFILLMENT_STATUS.READY_TO_SHIP) {
          order.fulfillmentStatus = FULFILLMENT_STATUS.UNFULFILLED;
          orderUpdated = true;
        }
        break;
      }

      default:
        break;
    }

    if (orderUpdated) {
      await order.save({ session });
      logger.info(
        `Synchronized Order ${order.orderNumber} fulfillment/status from Shipment ${shipment.shipmentNumber} -> ${newStatus}`
      );
    }
  },
};
