import { Types } from 'mongoose';
import { Order } from './order.model.js';

import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  FULFILLMENT_STATUS,
  OrderStatus,
  CUSTOMER_CANCELLABLE_STATUSES,
  ADMIN_CANCELLABLE_STATUSES,
} from './order.constants.js';
import {
  CreateOrderInput,
  CancelOrderInput,
  CustomerOrderListQuery,
  AdminOrderListQuery,
  OrderDetailDTO,
  AdminOrderDetailDTO,
  OrderSummaryDTO,
} from './order.types.js';
import { orderMapper } from './order.mapper.js';
import { orderNumberService } from './order-number.service.js';
import { orderStatusService } from './order-status.service.js';
import { CheckoutSession } from '../checkout/checkout.model.js';
import { CHECKOUT_STATUS } from '../checkout/checkout.constants.js';
import { checkoutService } from '../checkout/checkout.service.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { paymentService } from '../payments/payment.service.js';
import { cartService } from '../cart/cart.service.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/utils/logger.js';

export const orderService = {
  /**
   * Converts an active, valid CheckoutSession into an immutable Order.
   * Handles idempotency, final inventory reservation consumption, checkout completion, and cart clearing.
   */
  async createOrder(userId: string, input: CreateOrderInput = {}): Promise<OrderDetailDTO> {
    const customerObjId = new Types.ObjectId(userId);

    // 1. Find user's active or recent checkout session
    const checkoutSession = await CheckoutSession.findOne({
      userId: customerObjId,
      status: { $in: [CHECKOUT_STATUS.ACTIVE, CHECKOUT_STATUS.COMPLETED] },
    }).sort({ createdAt: -1 });

    if (!checkoutSession) {
      throw AppError.notFound(
        'No active checkout session found to place order.',
        ErrorCodes.ERR_ORDER_CHECKOUT_NOT_FOUND
      );
    }

    // 2. Check Idempotency: If an Order already exists for this checkoutSessionId, return it!
    const existingOrder = await Order.findOne({
      checkoutSessionId: checkoutSession._id,
    });

    if (existingOrder) {
      logger.info(
        `Idempotent Order return: Order ${existingOrder.orderNumber} already exists for Checkout ${checkoutSession._id.toString()}`
      );
      return orderMapper.toOrderDetailDTO(existingOrder);
    }

    // If the session was completed or cancelled without an order, reject
    if (checkoutSession.status !== CHECKOUT_STATUS.ACTIVE) {
      throw AppError.badRequest(
        `Cannot place order. Checkout session is in '${checkoutSession.status}' state.`,
        ErrorCodes.ERR_ORDER_CHECKOUT_INVALID
      );
    }

    // 3. Expiration Check (15-min TTL)
    if (checkoutSession.expiresAt.getTime() <= Date.now()) {
      // Transition expired session and release stock
      await checkoutService.getActiveCheckout(userId).catch(() => null);
      throw AppError.create(
        410,
        'Checkout session has expired. Inventory reservations were released. Please start checkout again.',
        ErrorCodes.ERR_ORDER_CHECKOUT_EXPIRED
      );
    }

    // 4. Ensure inventory is reserved
    if (!checkoutSession.inventoryReserved) {
      throw AppError.badRequest(
        'Checkout session does not hold active inventory reservations.',
        ErrorCodes.ERR_ORDER_CHECKOUT_INVALID
      );
    }

    // 5. Revalidate Checkout (Checks active catalog status & detects any live price changes)
    await checkoutService.revalidateCheckout(userId);

    // Reload session after revalidation
    const validatedSession = await CheckoutSession.findById(checkoutSession._id);
    if (!validatedSession || validatedSession.status !== CHECKOUT_STATUS.ACTIVE) {
      throw AppError.badRequest(
        'Checkout session is no longer active after catalog revalidation.',
        ErrorCodes.ERR_ORDER_CHECKOUT_INVALID
      );
    }

    // 6. Fetch customer profile for immutable customerSnapshot
    const customerUser = await User.findById(customerObjId);
    if (!customerUser) {
      throw AppError.notFound('Customer user profile not found.', ErrorCodes.ERR_USER_NOT_FOUND);
    }

    // 7. Atomically generate unique order number
    const orderNumber = await orderNumberService.generateOrderNumber();

    // 8. Prepare Order instance
    const newOrder = new Order({
      orderNumber,
      userId: customerObjId,
      checkoutSessionId: validatedSession._id,
      status: ORDER_STATUS.PLACED,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      fulfillmentStatus: FULFILLMENT_STATUS.UNFULFILLED,
      items: validatedSession.items,
      customerSnapshot: {
        userId: customerUser._id,
        firstName: customerUser.firstName,
        lastName: customerUser.lastName,
        email: customerUser.email,
        phone: validatedSession.shippingAddress.phone || customerUser.phone || null,
      },
      shippingAddress: validatedSession.shippingAddress,
      billingAddress: validatedSession.billingAddress,
      subtotal: validatedSession.subtotal,
      total: validatedSession.subtotal,
      currency: validatedSession.currency,
      customerNotes: input.customerNotes ? input.customerNotes.trim() : null,
      statusHistory: [
        {
          status: ORDER_STATUS.PLACED,
          changedBy: customerUser._id,
          note: 'Order placed by customer',
          changedAt: new Date(),
        },
      ],
      placedAt: new Date(),
    });

    // 9. Consume & Finalize Inventory Reservations atomically (onHand -= qty, reserved -= qty)
    const finalizedItems: Array<{ variantId: Types.ObjectId; quantity: number }> = [];
    try {
      for (const item of validatedSession.items) {
        await inventoryService.finalizeReservation(
          item.variantId,
          item.quantity,
          newOrder._id.toString(),
          `Order ${orderNumber} final inventory consumption`
        );
        finalizedItems.push({
          variantId: item.variantId,
          quantity: item.quantity,
        });
      }
    } catch {
      logger.error(


        `Failed to finalize inventory for Order ${orderNumber}. Executing compensating rollback.`
      );
      // Compensating rollback: restore stock for items finalized so far
      for (const finalized of finalizedItems) {
        try {
          await inventoryService.restoreStockFromCancellation(
            finalized.variantId,
            finalized.quantity,
            newOrder._id.toString(),
            `Compensating rollback for failed order ${orderNumber}`
          );
        } catch {
          // Log but continue rollback loop
        }
      }
      throw AppError.badRequest(
        'Inventory finalization failed. Please review your checkout and try again.',
        ErrorCodes.ERR_ORDER_INVENTORY_FINALIZATION_FAILED
      );
    }

    // 10. Persist Order
    await newOrder.save();

    // 11. Complete CheckoutSession
    validatedSession.status = CHECKOUT_STATUS.COMPLETED;
    validatedSession.completedAt = new Date();
    validatedSession.inventoryReserved = false;
    await validatedSession.save();

    // 12. Clear Customer Cart (Success-only)
    try {
      await cartService.clearCart(userId);
    } catch (err: unknown) {
      logger.warn(`Failed to clear cart after successful order ${orderNumber}: ${String(err)}`);
    }

    logger.info(`Order ${orderNumber} successfully created for customer ${userId}`);
    return orderMapper.toOrderDetailDTO(newOrder);
  },

  /**
   * Customer: Get order history with pagination and status filtering.
   */
  async getCustomerOrders(
    userId: string,
    query: CustomerOrderListQuery
  ): Promise<{
    orders: OrderSummaryDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    const sortOptions: Record<string, any> = {
      newest: { placedAt: -1 },
      oldest: { placedAt: 1 },
      'total-high': { total: -1 },
      'total-low': { total: 1 },
    };
    const sort = sortOptions[query.sort || 'newest'] || { placedAt: -1 };

    const [orders, total] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      orders: orders.map((o) => orderMapper.toOrderSummaryDTO(o)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  },

  /**
   * Customer: Get single order details with ownership verification.
   */
  async getCustomerOrderById(userId: string, orderId: string): Promise<OrderDetailDTO> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    const order = await Order.findOne({
      _id: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    return orderMapper.toOrderDetailDTO(order);
  },

  /**
   * Customer: Cancel order while in allowed initial state (PLACED or CONFIRMED).
   * Atomically transitions status and restores physical inventory.
   */
  async cancelCustomerOrder(
    userId: string,
    orderId: string,
    input: CancelOrderInput = {}
  ): Promise<OrderDetailDTO> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    const customerObjId = new Types.ObjectId(userId);
    const orderObjId = new Types.ObjectId(orderId);

    const order = await Order.findOne({
      _id: orderObjId,
      userId: customerObjId,
    });

    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      throw AppError.badRequest('Order is already cancelled.', ErrorCodes.ERR_ORDER_ALREADY_CANCELLED);
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw AppError.badRequest(
        'Paid orders cannot be cancelled directly through simple cancellation. A refund or return workflow is required.',
        ErrorCodes.ERR_ORDER_PAID_CANCELLATION_REQUIRES_REFUND
      );
    }

    if (!orderStatusService.canCustomerCancelOrder(order)) {

      throw AppError.badRequest(
        `Cannot cancel order in '${order.status}' status. Cancellation is only allowed before order is processed.`,
        ErrorCodes.ERR_ORDER_CANNOT_CANCEL
      );
    }

    const reason = input.reason ? input.reason.trim() : 'Cancelled by customer';

    // Atomic update: only transition if still in cancellable status (prevents double cancellation race condition)
    const updated = await Order.findOneAndUpdate(
      {
        _id: orderObjId,
        userId: customerObjId,
        status: { $in: CUSTOMER_CANCELLABLE_STATUSES },
      },
      {
        $set: {
          status: ORDER_STATUS.CANCELLED,
          fulfillmentStatus: FULFILLMENT_STATUS.CANCELLED,
          cancelledAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: ORDER_STATUS.CANCELLED,
            changedBy: customerObjId,
            note: reason,
            changedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      throw AppError.badRequest(
        'Order cancellation failed or status changed concurrently.',
        ErrorCodes.ERR_ORDER_CANNOT_CANCEL
      );
    }

    // Atomically restore physical inventory onHand for each item
    for (const item of updated.items) {
      await inventoryService.restoreStockFromCancellation(
        item.variantId,
        item.quantity,
        updated._id.toString(),
        `Customer cancellation: ${reason}`
      );
    }

    // Safely mark pending payment attempts as cancelled
    await paymentService.cancelPaymentOnOrderCancellation(updated._id);

    logger.info(`Order ${updated.orderNumber} successfully cancelled by customer ${userId}`);

    return orderMapper.toOrderDetailDTO(updated);
  },

  /**
   * Admin: List all orders with filters, search, pagination, and sorting.
   */
  async getAdminOrders(query: AdminOrderListQuery): Promise<{
    orders: AdminOrderDetailDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }
    if (query.fulfillmentStatus) {
      filter.fulfillmentStatus = query.fulfillmentStatus;
    }

    if (query.dateFrom || query.dateTo) {
      filter.placedAt = {};
      if (query.dateFrom) filter.placedAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.placedAt.$lte = new Date(query.dateTo);
    }

    if (query.search) {
      const sanitized = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { orderNumber: { $regex: sanitized, $options: 'i' } },
        { 'customerSnapshot.email': { $regex: sanitized, $options: 'i' } },
        { 'customerSnapshot.firstName': { $regex: sanitized, $options: 'i' } },
        { 'customerSnapshot.lastName': { $regex: sanitized, $options: 'i' } },
        { 'items.sku': { $regex: sanitized, $options: 'i' } },
      ];
    }

    const sortOptions: Record<string, any> = {
      newest: { placedAt: -1 },
      oldest: { placedAt: 1 },
      'total-high': { total: -1 },
      'total-low': { total: 1 },
      status: { status: 1, placedAt: -1 },
    };
    const sort = sortOptions[query.sort || 'newest'] || { placedAt: -1 };

    const [orders, total] = await Promise.all([
      Order.find(filter).sort(sort).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      orders: orders.map((o) => orderMapper.toAdminOrderDetailDTO(o)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  },

  /**
   * Admin: Get order details by ID.
   */
  async getAdminOrderById(orderId: string): Promise<AdminOrderDetailDTO> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    return orderMapper.toAdminOrderDetailDTO(order);
  },

  /**
   * Admin: Update order status along valid state transition paths.
   */
  async updateAdminOrderStatus(
    orderId: string,
    adminId: string,
    newStatus: OrderStatus,
    note?: string
  ): Promise<AdminOrderDetailDTO> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    // Cancellation requires stock restoration and must go through cancelAdminOrder
    if (newStatus === ORDER_STATUS.CANCELLED) {
      return this.cancelAdminOrder(
        orderId,
        adminId,
        note || 'Order cancelled by administrator'
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    if (!orderStatusService.canTransitionOrderStatus(order.status, newStatus)) {
      throw AppError.badRequest(
        `Cannot transition order status from '${order.status}' to '${newStatus}'.`,
        ErrorCodes.ERR_ORDER_INVALID_STATUS_TRANSITION
      );
    }

    let mappedFulfillment: typeof FULFILLMENT_STATUS[keyof typeof FULFILLMENT_STATUS] = order.fulfillmentStatus;
    if (newStatus === ORDER_STATUS.CONFIRMED) {
      mappedFulfillment = FULFILLMENT_STATUS.UNFULFILLED;
    } else if (newStatus === ORDER_STATUS.PROCESSING) {
      mappedFulfillment = FULFILLMENT_STATUS.PROCESSING;
    } else if (newStatus === ORDER_STATUS.READY_TO_SHIP) {
      mappedFulfillment = FULFILLMENT_STATUS.READY_TO_SHIP;
    } else if (newStatus === ORDER_STATUS.SHIPPED) {
      mappedFulfillment = FULFILLMENT_STATUS.SHIPPED;
    } else if (newStatus === ORDER_STATUS.DELIVERED) {
      mappedFulfillment = FULFILLMENT_STATUS.DELIVERED;
    }

    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: order.status,
      },
      {
        $set: {
          status: newStatus,
          fulfillmentStatus: mappedFulfillment,
          completedAt: newStatus === ORDER_STATUS.DELIVERED ? new Date() : order.completedAt,
        },
        $push: {
          statusHistory: {
            status: newStatus,
            changedBy: new Types.ObjectId(adminId),
            note: note ? note.trim() : `Status updated to ${newStatus}`,
            changedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      throw AppError.badRequest(
        'Order status update failed due to concurrent modification.',
        ErrorCodes.ERR_ORDER_INVALID_STATUS_TRANSITION
      );
    }

    logger.info(`Order ${updated.orderNumber} status changed from ${order.status} to ${newStatus} by admin ${adminId}`);
    return orderMapper.toAdminOrderDetailDTO(updated);
  },

  /**
   * Admin: Explicitly cancel order and restore inventory stock.
   */
  async cancelAdminOrder(
    orderId: string,
    adminId: string,
    reason: string
  ): Promise<AdminOrderDetailDTO> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      throw AppError.badRequest('Order is already cancelled.', ErrorCodes.ERR_ORDER_ALREADY_CANCELLED);
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw AppError.badRequest(
        'Paid orders cannot be cancelled directly through simple cancellation. A refund or return workflow is required.',
        ErrorCodes.ERR_ORDER_PAID_CANCELLATION_REQUIRES_REFUND
      );
    }

    if (!orderStatusService.canAdminCancelOrder(order)) {

      throw AppError.badRequest(
        `Cannot cancel order in '${order.status}' status. Orders cannot be cancelled after shipping.`,
        ErrorCodes.ERR_ORDER_CANNOT_CANCEL
      );
    }

    const adminObjId = new Types.ObjectId(adminId);
    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: { $in: ADMIN_CANCELLABLE_STATUSES },
      },
      {
        $set: {
          status: ORDER_STATUS.CANCELLED,
          fulfillmentStatus: FULFILLMENT_STATUS.CANCELLED,
          cancelledAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: ORDER_STATUS.CANCELLED,
            changedBy: adminObjId,
            note: reason.trim(),
            changedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      throw AppError.badRequest(
        'Order cancellation failed or status changed concurrently.',
        ErrorCodes.ERR_ORDER_CANNOT_CANCEL
      );
    }

    // Atomically restore physical inventory onHand for each item
    for (const item of updated.items) {
      await inventoryService.restoreStockFromCancellation(
        item.variantId,
        item.quantity,
        updated._id.toString(),
        `Admin cancellation: ${reason}`
      );
    }

    // Safely mark pending payment attempts as cancelled
    await paymentService.cancelPaymentOnOrderCancellation(updated._id);

    logger.info(`Order ${updated.orderNumber} cancelled by admin ${adminId}. Reason: ${reason}`);

    return orderMapper.toAdminOrderDetailDTO(updated);
  },

  /**
   * Admin: Update internal administration notes on an order.
   */
  async updateAdminInternalNotes(
    orderId: string,
    internalNotes: string
  ): Promise<AdminOrderDetailDTO> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    const updated = await Order.findByIdAndUpdate(
      orderId,
      { $set: { internalNotes: internalNotes.trim() } },
      { new: true }
    );

    if (!updated) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    return orderMapper.toAdminOrderDetailDTO(updated);
  },
};
