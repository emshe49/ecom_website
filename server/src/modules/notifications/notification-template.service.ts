import {
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
  NotificationType,
  NotificationCategory,
} from './notification.constants.js';

export const notificationTemplateService = {
  /**
   * Sanitizes string to plain text and limits length
   */
  sanitizeText(text: string, maxLength: number): string {
    return text.replace(/<[^>]*>?/gm, '').trim().slice(0, maxLength);
  },

  /**
   * Generates sanitized notification payload for Order events
   */
  formatOrderNotification(
    orderNumber: string,
    status: string,
    orderId: string
  ): {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
  } {
    let type: NotificationType = NOTIFICATION_TYPE.ORDER_PROCESSING;
    let title = 'Order Update';
    let message = `Your order ${orderNumber} is now ${status.toLowerCase()}.`;

    switch (status) {
      case 'PLACED':
        type = NOTIFICATION_TYPE.ORDER_PLACED;
        title = 'Order Placed';
        message = `Your order ${orderNumber} has been placed successfully.`;
        break;
      case 'CONFIRMED':
        type = NOTIFICATION_TYPE.ORDER_CONFIRMED;
        title = 'Order Confirmed';
        message = `Your order ${orderNumber} has been confirmed.`;
        break;
      case 'PROCESSING':
        type = NOTIFICATION_TYPE.ORDER_PROCESSING;
        title = 'Order Processing';
        message = `Your order ${orderNumber} is now being processed.`;
        break;
      case 'READY_TO_SHIP':
        type = NOTIFICATION_TYPE.ORDER_READY_TO_SHIP;
        title = 'Ready to Ship';
        message = `Your order ${orderNumber} is packaged and ready for dispatch.`;
        break;
      case 'SHIPPED':
        type = NOTIFICATION_TYPE.ORDER_SHIPPED;
        title = 'Order Shipped';
        message = `Your order ${orderNumber} has been shipped.`;
        break;
      case 'DELIVERED':
        type = NOTIFICATION_TYPE.ORDER_DELIVERED;
        title = 'Order Delivered';
        message = `Your order ${orderNumber} has been delivered.`;
        break;
      case 'CANCELLED':
        type = NOTIFICATION_TYPE.ORDER_CANCELLED;
        title = 'Order Cancelled';
        message = `Your order ${orderNumber} has been cancelled.`;
        break;
    }

    return {
      type,
      category: NOTIFICATION_CATEGORY.ORDER,
      title: this.sanitizeText(title, 150),
      message: this.sanitizeText(message, 500),
      actionUrl: `/orders/${orderId}`,
      metadata: {
        orderId,
        orderNumber,
        status,
      },
    };
  },

  /**
   * Generates sanitized notification payload for Payment events
   */
  formatPaymentNotification(
    orderNumber: string,
    orderId: string,
    paymentStatus: string,
    amount?: number,
    currency?: string
  ): {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
  } {
    let type: NotificationType = NOTIFICATION_TYPE.PAYMENT_PENDING;
    let title = 'Payment Update';
    let message = `Payment status for order ${orderNumber}: ${paymentStatus.toLowerCase()}.`;

    if (paymentStatus === 'PAID' || paymentStatus === 'SUCCEEDED') {
      type = NOTIFICATION_TYPE.PAYMENT_SUCCEEDED;
      title = 'Payment Successful';
      message = `Payment for order ${orderNumber} was completed successfully.`;
    } else if (paymentStatus === 'FAILED') {
      type = NOTIFICATION_TYPE.PAYMENT_FAILED;
      title = 'Payment Failed';
      message = `Payment attempt for order ${orderNumber} could not be completed. Please try again.`;
    } else if (paymentStatus === 'REFUNDED') {
      type = NOTIFICATION_TYPE.PAYMENT_REFUNDED;
      title = 'Payment Refunded';
      message = `Payment for order ${orderNumber} has been fully refunded.`;
    } else if (paymentStatus === 'PARTIALLY_REFUNDED') {
      type = NOTIFICATION_TYPE.PAYMENT_PARTIALLY_REFUNDED;
      title = 'Partial Refund';
      message = `A partial refund was processed for order ${orderNumber}.`;
    }

    return {
      type,
      category: NOTIFICATION_CATEGORY.PAYMENT,
      title: this.sanitizeText(title, 150),
      message: this.sanitizeText(message, 500),
      actionUrl: `/orders/${orderId}`,
      metadata: {
        orderId,
        orderNumber,
        paymentStatus,
        amount: amount || undefined,
        currency: currency || undefined,
      },
    };
  },

  /**
   * Generates sanitized notification payload for Shipping events
   */
  formatShipmentNotification(
    orderNumber: string,
    orderId: string,
    shipmentStatus: string,
    trackingNumber?: string,
    carrierName?: string
  ): {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
  } {
    let type: NotificationType = NOTIFICATION_TYPE.SHIPMENT_CREATED;
    let title = 'Shipment Update';
    let message = `Shipment for order ${orderNumber} has been updated to ${shipmentStatus.toLowerCase()}.`;

    switch (shipmentStatus) {
      case 'CREATED':
        type = NOTIFICATION_TYPE.SHIPMENT_CREATED;
        title = 'Shipment Created';
        message = `A shipment package has been prepared for order ${orderNumber}.`;
        break;
      case 'SHIPPED':
        type = NOTIFICATION_TYPE.SHIPMENT_SHIPPED;
        title = 'Order Dispatched';
        message = `Order ${orderNumber} is on the way${carrierName ? ` via ${carrierName}` : ''}.`;
        break;
      case 'IN_TRANSIT':
        type = NOTIFICATION_TYPE.SHIPMENT_IN_TRANSIT;
        title = 'Shipment In Transit';
        message = `Your package for order ${orderNumber} is currently in transit.`;
        break;
      case 'OUT_FOR_DELIVERY':
        type = NOTIFICATION_TYPE.SHIPMENT_OUT_FOR_DELIVERY;
        title = 'Out for Delivery';
        message = `Your order ${orderNumber} is out for delivery today!`;
        break;
      case 'DELIVERED':
        type = NOTIFICATION_TYPE.SHIPMENT_DELIVERED;
        title = 'Package Delivered';
        message = `Your package for order ${orderNumber} was delivered successfully.`;
        break;
      case 'FAILED':
        type = NOTIFICATION_TYPE.SHIPMENT_FAILED;
        title = 'Delivery Attempt Issue';
        message = `There was an issue delivering order ${orderNumber}. Our team is working to resolve it.`;
        break;
    }

    return {
      type,
      category: NOTIFICATION_CATEGORY.SHIPPING,
      title: this.sanitizeText(title, 150),
      message: this.sanitizeText(message, 500),
      actionUrl: `/orders/${orderId}`,
      metadata: {
        orderId,
        orderNumber,
        shipmentStatus,
        trackingNumber: trackingNumber || undefined,
        carrierName: carrierName || undefined,
      },
    };
  },

  /**
   * Generates sanitized notification payload for Review moderation events
   */
  formatReviewNotification(
    productName: string,
    status: string,
    moderationReason?: string
  ): {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
  } {
    let type: NotificationType = NOTIFICATION_TYPE.REVIEW_PUBLISHED;
    let title = 'Review Published';
    let message = `Your review for "${productName}" is now live on the store.`;

    if (status === 'HIDDEN') {
      type = NOTIFICATION_TYPE.REVIEW_HIDDEN;
      title = 'Review Moderation Notice';
      message = `Your review for "${productName}" was hidden${moderationReason ? `: ${moderationReason}` : '.'}`;
    } else if (status === 'REJECTED') {
      type = NOTIFICATION_TYPE.REVIEW_REJECTED;
      title = 'Review Declined';
      message = `Your review for "${productName}" was not approved${moderationReason ? `: ${moderationReason}` : '.'}`;
    }

    return {
      type,
      category: NOTIFICATION_CATEGORY.REVIEW,
      title: this.sanitizeText(title, 150),
      message: this.sanitizeText(message, 500),
      actionUrl: '/account/reviews',
      metadata: {
        productName,
        status,
        moderationReason: moderationReason || undefined,
      },
    };
  },

  /**
   * Generates sanitized notification payload for Return events
   */
  formatReturnNotification(
    returnNumber: string,
    returnId: string,
    status: string,
    reason?: string
  ): {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
  } {
    let type: NotificationType = NOTIFICATION_TYPE.RETURN_REQUESTED;
    let title = 'Return Request Received';
    let message = `Your return request ${returnNumber} has been received.`;

    switch (status) {
      case 'APPROVED':
        type = NOTIFICATION_TYPE.RETURN_APPROVED;
        title = 'Return Approved';
        message = `Your return request ${returnNumber} has been approved.`;
        break;
      case 'REJECTED':
        type = NOTIFICATION_TYPE.RETURN_REJECTED;
        title = 'Return Request Declined';
        message = `Your return request ${returnNumber} was not approved${reason ? `: ${reason}` : '.'}`;
        break;
      case 'RECEIVED':
        type = NOTIFICATION_TYPE.RETURN_RECEIVED;
        title = 'Return Items Received';
        message = `We have received your returned items for ${returnNumber}.`;
        break;
      case 'REFUND_PENDING':
        type = NOTIFICATION_TYPE.RETURN_REFUND_PENDING;
        title = 'Return Refund In Progress';
        message = `Inspection passed for return ${returnNumber}. Your refund is being processed.`;
        break;
      case 'COMPLETED':
        type = NOTIFICATION_TYPE.RETURN_COMPLETED;
        title = 'Return Completed';
        message = `Return ${returnNumber} has been fully completed.`;
        break;
    }

    return {
      type,
      category: NOTIFICATION_CATEGORY.RETURN,
      title: this.sanitizeText(title, 150),
      message: this.sanitizeText(message, 500),
      actionUrl: `/account/returns/${returnId}`,
      metadata: {
        returnId,
        returnNumber,
        status,
      },
    };
  },

  /**
   * Generates sanitized notification payload for Refund events
   */
  formatRefundNotification(
    refundNumber: string,
    refundId: string,
    status: string,
    amount?: number,
    currency?: string
  ): {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
  } {
    let type: NotificationType = NOTIFICATION_TYPE.REFUND_SUCCEEDED;
    let title = 'Refund Completed';
    let message = `Your refund ${refundNumber} has been processed successfully.`;

    if (status === 'FAILED') {
      type = NOTIFICATION_TYPE.REFUND_FAILED;
      title = 'Refund Processing Notice';
      message = `We encountered an issue processing refund ${refundNumber}. Our support team has been notified.`;
    }

    return {
      type,
      category: NOTIFICATION_CATEGORY.REFUND,
      title: this.sanitizeText(title, 150),
      message: this.sanitizeText(message, 500),
      actionUrl: `/account/returns/${refundId}`,
      metadata: {
        refundId,
        refundNumber,
        status,
        amount: amount || undefined,
        currency: currency || undefined,
      },
    };
  },

  /**
   * Generates sanitized notification payload for Low Stock alerts (Admin)
   */
  formatLowStockNotification(
    productName: string,
    sku: string,
    availableStock: number,
    threshold: number
  ): {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
  } {
    const isOutOfStock = availableStock <= 0;
    const title = isOutOfStock ? 'Out of Stock Alert' : 'Low Stock Warning';
    const message = isOutOfStock
      ? `Product "${productName}" (${sku}) is completely out of stock.`
      : `Product "${productName}" (${sku}) reached low inventory (${availableStock} left, threshold: ${threshold}).`;

    return {
      type: NOTIFICATION_TYPE.LOW_STOCK_ALERT,
      category: NOTIFICATION_CATEGORY.INVENTORY,
      title: this.sanitizeText(title, 150),
      message: this.sanitizeText(message, 500),
      actionUrl: '/admin/inventory',
      metadata: {
        sku,
        productName,
        availableStock,
        threshold,
      },
    };
  },
};
