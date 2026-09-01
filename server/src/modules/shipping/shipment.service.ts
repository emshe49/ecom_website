import { Types } from 'mongoose';
import { Shipment } from './shipment.model.js';
import { Order } from '../orders/order.model.js';
import { Payment } from '../payments/payment.model.js';
import {
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
} from '../payments/payment.constants.js';
import {
  ORDER_STATUS,
  PAYMENT_STATUS as ORDER_PAYMENT_STATUS,
} from '../orders/order.constants.js';
import {
  SHIPMENT_STATUS,
  CARRIER_TYPE,
  CANCELLABLE_SHIPMENT_STATUSES,
} from './shipping.constants.js';
import {
  CreateShipmentInput,
  UpdateShipmentStatusInput,
  UpdateShipmentTrackingInput,
  AdminShipmentDetailDTO,
  AdminShipmentSummaryDTO,
  CustomerShipmentDTO,
  AdminShipmentListQuery,
} from './shipping.types.js';
import { shippingMapper } from './shipping.mapper.js';
import { shipmentNumberService } from './shipment-number.service.js';
import { shipmentStatusService } from './shipment-status.service.js';
import { shippingProviderRegistry } from './providers/provider-registry.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/utils/logger.js';

export const shipmentService = {
  /**
   * Creates a new Shipment for an eligible Order.
   */
  async createShipment(
    orderId: string,
    adminUserId: string,
    input: CreateShipmentInput = {}
  ): Promise<AdminShipmentDetailDTO> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw AppError.badRequest('Invalid order ID format.', ErrorCodes.BAD_REQUEST);
    }

    const orderObjId = new Types.ObjectId(orderId);
    const adminObjId = new Types.ObjectId(adminUserId);

    // 1. Fetch Order
    const order = await Order.findById(orderObjId);
    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    // 2. Validate Order state
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw AppError.badRequest(
        'Cannot create a shipment for a cancelled order.',
        ErrorCodes.ERR_SHIPMENT_ORDER_NOT_FULFILLABLE
      );
    }

    if (order.status === ORDER_STATUS.DELIVERED) {
      throw AppError.badRequest(
        'Cannot create a shipment for an already delivered order.',
        ErrorCodes.ERR_SHIPMENT_ALREADY_DELIVERED
      );
    }

    // 3. Enforce Single Shipment per Order rule
    const existingShipment = await Shipment.findOne({ orderId: orderObjId });
    if (existingShipment) {
      throw AppError.conflict(
        `Shipment already exists for Order ${order.orderNumber} (Shipment #${existingShipment.shipmentNumber}).`,
        ErrorCodes.ERR_SHIPMENT_ALREADY_EXISTS
      );
    }

    // 4. Generate unique atomic shipment number
    const shipmentNumber = await shipmentNumberService.generateShipmentNumber();

    // 5. Build Shipment entity with snapshots from Order
    const carrier = (input.carrier?.trim().toUpperCase() || CARRIER_TYPE.MANUAL) as string;

    const shipment = new Shipment({
      shipmentNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: SHIPMENT_STATUS.PENDING,
      carrier,
      carrierName: input.carrierName?.trim() || (input.carrier ? input.carrier.trim() : 'Manual Carrier'),
      service: input.service?.trim() || null,
      trackingNumber: input.trackingNumber?.trim() || null,
      trackingUrl: input.trackingUrl?.trim() || null,
      internalNotes: input.internalNotes?.trim() || null,
      customerSnapshot: order.customerSnapshot,
      shippingAddress: order.shippingAddress,
      items: order.items,
      shippingMethod: {
        shippingMethodId: order.shippingMethod?.shippingMethodId,
        code: order.shippingMethod?.code || 'STANDARD',
        name: order.shippingMethod?.name || 'Standard Delivery',
        fee: order.shippingMethod?.fee || order.shippingFee || 0,
        currency: order.currency || 'PKR',
        estimatedMinDays: order.shippingMethod?.estimatedMinDays || 3,
        estimatedMaxDays: order.shippingMethod?.estimatedMaxDays || 5,
      },
      statusHistory: [
        {
          status: SHIPMENT_STATUS.PENDING,
          changedBy: adminObjId,
          note: input.initialNote?.trim() || 'Shipment created and awaiting fulfillment.',
          changedAt: new Date(),
        },
      ],
      createdBy: adminObjId,
    });

    // Notify provider (e.g. manual provider logs/registers)
    const provider = shippingProviderRegistry.getProvider(carrier);
    await provider.createShipment(shipment).catch((err) => {
      logger.warn(`Shipping provider notification error: ${err.message}`);
    });

    await shipment.save();
    logger.info(
      `Shipment ${shipment.shipmentNumber} created for Order ${order.orderNumber} by staff ${adminUserId}`
    );

    return shippingMapper.toAdminShipmentDetailDTO(shipment);
  },

  /**
   * Updates shipment status, enforcing payment rules and state transitions.
   */
  async updateShipmentStatus(
    shipmentId: string,
    adminUserId: string,
    input: UpdateShipmentStatusInput
  ): Promise<AdminShipmentDetailDTO> {
    if (!Types.ObjectId.isValid(shipmentId)) {
      throw AppError.badRequest('Invalid shipment ID format.', ErrorCodes.BAD_REQUEST);
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw AppError.notFound('Shipment not found.', ErrorCodes.ERR_SHIPMENT_NOT_FOUND);
    }

    const fromStatus = shipment.status;
    const toStatus = input.status;

    // 1. Validate status machine transition
    shipmentStatusService.validateTransition(fromStatus, toStatus);

    // 2. Check Payment & Fulfillment Rule when dispatching (SHIPPED)
    if (toStatus === SHIPMENT_STATUS.SHIPPED) {
      await this.verifyPaymentBeforeShipping(shipment.orderId);
    }

    const adminObjId = adminUserId ? new Types.ObjectId(adminUserId) : null;
    const now = new Date();

    // 3. Set milestone timestamps
    if (toStatus === SHIPMENT_STATUS.SHIPPED && !shipment.shippedAt) {
      shipment.shippedAt = now;
    } else if (toStatus === SHIPMENT_STATUS.DELIVERED && !shipment.deliveredAt) {
      shipment.deliveredAt = now;
    } else if (toStatus === SHIPMENT_STATUS.FAILED && !shipment.failedAt) {
      shipment.failedAt = now;
    } else if (toStatus === SHIPMENT_STATUS.CANCELLED && !shipment.cancelledAt) {
      shipment.cancelledAt = now;
    }

    // 4. Update status and append timeline
    shipment.status = toStatus;
    if (input.trackingNumber) {
      shipment.trackingNumber = input.trackingNumber.trim();
    }
    if (input.trackingUrl) {
      shipment.trackingUrl = input.trackingUrl.trim();
    }
    shipment.statusHistory.push({
      status: toStatus,
      changedBy: adminObjId,
      note: input.note?.trim() || null,
      changedAt: now,
    });

    await shipment.save();

    // 5. Synchronize Order state and status history
    await shipmentStatusService.syncOrderOnShipmentStatusChange(
      shipment,
      toStatus,
      adminUserId
    );

    logger.info(
      `Shipment ${shipment.shipmentNumber} transitioned: ${fromStatus} -> ${toStatus}`
    );

    return shippingMapper.toAdminShipmentDetailDTO(shipment);
  },

  /**
   * Verifies that payment rules allow the order to be shipped.
   * ONLINE payments MUST be PAID. COD payments are allowed in PENDING status.
   */
  async verifyPaymentBeforeShipping(orderId: Types.ObjectId): Promise<void> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found for shipment.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    // If order is already PAID, shipping is allowed unconditionally
    if (order.paymentStatus === ORDER_PAYMENT_STATUS.PAID) {
      return;
    }

    // Check payment record to determine method
    const payment = await Payment.findOne({ orderId: order._id });

    // If payment record indicates COD, shipping is permitted while payment is PENDING
    if (
      payment &&
      (payment.method === PAYMENT_METHOD.CASH_ON_DELIVERY ||
        payment.provider === PAYMENT_PROVIDER.COD)
    ) {
      return;
    }

    // For ONLINE payments that are not PAID, shipping is strictly rejected
    throw AppError.badRequest(
      `Cannot ship order ${order.orderNumber}. Online payment has not been completed (payment status: ${order.paymentStatus}).`,
      ErrorCodes.ERR_SHIPMENT_ORDER_PAYMENT_REQUIRED
    );
  },

  /**
   * Updates carrier and tracking details.
   */
  async updateTracking(
    shipmentId: string,
    _adminUserId: string,
    input: UpdateShipmentTrackingInput
  ): Promise<AdminShipmentDetailDTO> {
    if (!Types.ObjectId.isValid(shipmentId)) {
      throw AppError.badRequest('Invalid shipment ID format.', ErrorCodes.BAD_REQUEST);
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw AppError.notFound('Shipment not found.', ErrorCodes.ERR_SHIPMENT_NOT_FOUND);
    }

    if (input.carrier) shipment.carrier = input.carrier.trim().toUpperCase();
    if (input.service !== undefined) shipment.service = input.service ? input.service.trim() : null;
    if (input.trackingNumber !== undefined)
      shipment.trackingNumber = input.trackingNumber ? input.trackingNumber.trim() : null;
    if (input.trackingUrl !== undefined)
      shipment.trackingUrl = input.trackingUrl ? input.trackingUrl.trim() : null;

    await shipment.save();
    logger.info(
      `Tracking updated for Shipment ${shipment.shipmentNumber}: Carrier=${shipment.carrier}, Tracking=${shipment.trackingNumber}`
    );

    return shippingMapper.toAdminShipmentDetailDTO(shipment);
  },

  /**
   * Cancels a shipment if in cancellable state.
   */
  async cancelShipment(
    shipmentId: string,
    adminUserId: string,
    note?: string | null
  ): Promise<AdminShipmentDetailDTO> {
    if (!Types.ObjectId.isValid(shipmentId)) {
      throw AppError.badRequest('Invalid shipment ID format.', ErrorCodes.BAD_REQUEST);
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw AppError.notFound('Shipment not found.', ErrorCodes.ERR_SHIPMENT_NOT_FOUND);
    }

    if (!CANCELLABLE_SHIPMENT_STATUSES.includes(shipment.status)) {
      throw AppError.badRequest(
        `Cannot cancel shipment in '${shipment.status}' status. Shipment has already been dispatched.`,
        ErrorCodes.ERR_SHIPMENT_INVALID_STATUS_TRANSITION
      );
    }

    return this.updateShipmentStatus(shipmentId, adminUserId, {
      status: SHIPMENT_STATUS.CANCELLED,
      note: note || 'Shipment cancelled by administrator.',
    });
  },

  /**
   * Retrieves shipment tracking details for a customer.
   */
  async getCustomerShipment(
    orderId: string,
    userId: string
  ): Promise<CustomerShipmentDTO> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw AppError.badRequest('Invalid order ID format.', ErrorCodes.BAD_REQUEST);
    }

    const orderObjId = new Types.ObjectId(orderId);
    const userObjId = new Types.ObjectId(userId);

    // Verify order exists and belongs to the customer
    const order = await Order.findOne({ _id: orderObjId, userId: userObjId });
    if (!order) {
      throw AppError.notFound(
        'Order not found or does not belong to customer.',
        ErrorCodes.ERR_ORDER_NOT_FOUND
      );
    }

    const shipment = await Shipment.findOne({ orderId: orderObjId });
    if (!shipment) {
      throw AppError.notFound(
        'No shipment record found for this order yet.',
        ErrorCodes.ERR_SHIPMENT_NOT_FOUND
      );
    }

    return shippingMapper.toCustomerShipmentDTO(shipment);
  },

  /**
   * Retrieves detailed shipment for admin.
   */
  async getAdminShipmentDetail(shipmentId: string): Promise<AdminShipmentDetailDTO> {
    if (!Types.ObjectId.isValid(shipmentId)) {
      throw AppError.badRequest('Invalid shipment ID format.', ErrorCodes.BAD_REQUEST);
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      throw AppError.notFound('Shipment not found.', ErrorCodes.ERR_SHIPMENT_NOT_FOUND);
    }

    return shippingMapper.toAdminShipmentDetailDTO(shipment);
  },

  /**
   * Retrieves shipment by orderId for admin order details view.
   */
  async getShipmentByOrderId(
    orderId: string
  ): Promise<AdminShipmentDetailDTO | null> {
    if (!Types.ObjectId.isValid(orderId)) {
      return null;
    }

    const shipment = await Shipment.findOne({
      orderId: new Types.ObjectId(orderId),
    });
    if (!shipment) {
      return null;
    }

    return shippingMapper.toAdminShipmentDetailDTO(shipment);
  },

  /**
   * Lists shipments for admin with pagination, filtering, and search.
   */
  async listShipments(
    query: AdminShipmentListQuery
  ): Promise<{
    shipments: AdminShipmentSummaryDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.carrier) {
      filter.carrier = query.carrier.trim().toUpperCase();
    }

    if (query.orderNumber) {
      filter.orderNumber = { $regex: query.orderNumber.trim(), $options: 'i' };
    }

    if (query.trackingNumber) {
      filter.trackingNumber = {
        $regex: query.trackingNumber.trim(),
        $options: 'i',
      };
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    if (query.search && query.search.trim()) {
      const sanitized = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { shipmentNumber: { $regex: sanitized, $options: 'i' } },
        { orderNumber: { $regex: sanitized, $options: 'i' } },
        { trackingNumber: { $regex: sanitized, $options: 'i' } },
        { 'customerSnapshot.email': { $regex: sanitized, $options: 'i' } },
        { 'customerSnapshot.firstName': { $regex: sanitized, $options: 'i' } },
        { 'customerSnapshot.lastName': { $regex: sanitized, $options: 'i' } },
      ];
    }

    const [shipments, total] = await Promise.all([
      Shipment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Shipment.countDocuments(filter),
    ]);

    return {
      shipments: shipments.map((s) =>
        shippingMapper.toAdminShipmentSummaryDTO(s as any)
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
