import { Types } from 'mongoose';
import { Notification, NotificationDocument } from './notification.model.js';
import { NotificationPreference } from './notification-preference.model.js';
import { notificationTemplateService } from './notification-template.service.js';
import { notificationRecipientService } from './notification-recipient.service.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import { CreateNotificationInput } from './notification.types.js';
import { logger } from '../../shared/utils/logger.js';

export const notificationService = {
  /**
   * Internal method: Creates a notification safely with preference checks and deduplication.
   * Isolates failures so core domain transactions are never broken by secondary notifications.
   */
  async createNotification(
    input: CreateNotificationInput
  ): Promise<NotificationDocument | null> {
    try {
      // 1. Check user preferences
      const preference = await NotificationPreference.findOne({
        userId: new Types.ObjectId(input.userId),
      });

      if (preference) {
        const categoryKey = input.category.toLowerCase() as keyof typeof preference;
        // Non-critical promotional notifications can be suppressed if disabled
        if (
          categoryKey in preference &&
          preference[categoryKey] === false &&
          input.category === 'PROMOTION'
        ) {
          logger.info(
            `Notification suppressed by user preferences: ${input.userId} [${input.type}]`,
            'NotificationService'
          );
          return null;
        }
      }

      // 2. Handle deduplication if key provided
      if (input.deduplicationKey) {
        const existing = await Notification.findOne({
          deduplicationKey: input.deduplicationKey,
        });
        if (existing) {
          return existing;
        }
      }

      // 3. Create document
      const doc = await Notification.create({
        userId: new Types.ObjectId(input.userId),
        type: input.type,
        category: input.category,
        title: input.title,
        message: input.message,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        actionUrl: input.actionUrl || null,
        metadata: input.metadata || null,
        deduplicationKey: input.deduplicationKey || undefined,
        sourceModule: input.sourceModule || null,
      });

      return doc;
    } catch (err: any) {
      // If MongoDB duplicate key error on deduplicationKey (code 11000)
      if (err.code === 11000 && input.deduplicationKey) {
        const existing = await Notification.findOne({
          deduplicationKey: input.deduplicationKey,
        });
        if (existing) return existing;
      }

      logger.error(
        `Failed to create notification: ${err.message}`,
        'NotificationService',
        {
          userId: input.userId,
          type: input.type,
          deduplicationKey: input.deduplicationKey,
        }
      );
      return null;
    }
  },

  /**
   * Order Events Integration
   */
  async notifyOrderEvent(
    userId: string,
    orderId: string,
    orderNumber: string,
    status: string
  ): Promise<void> {
    const template = notificationTemplateService.formatOrderNotification(
      orderNumber,
      status,
      orderId
    );

    const deduplicationKey = `order:${orderId}:${status.toLowerCase()}`;

    await this.createNotification({
      userId,
      type: template.type,
      category: template.category,
      title: template.title,
      message: template.message,
      entityType: 'ORDER',
      entityId: orderId,
      actionUrl: template.actionUrl,
      metadata: template.metadata,
      deduplicationKey,
      sourceModule: 'orders',
    });
  },

  /**
   * Payment Events Integration
   */
  async notifyPaymentEvent(
    userId: string,
    orderId: string,
    orderNumber: string,
    paymentId: string,
    paymentStatus: string,
    amount?: number,
    currency?: string,
    attemptId?: string
  ): Promise<void> {
    const template = notificationTemplateService.formatPaymentNotification(
      orderNumber,
      orderId,
      paymentStatus,
      amount,
      currency
    );

    const deduplicationKey = attemptId
      ? `payment-attempt:${attemptId}:${paymentStatus.toLowerCase()}`
      : `payment:${paymentId}:${paymentStatus.toLowerCase()}`;

    await this.createNotification({
      userId,
      type: template.type,
      category: template.category,
      title: template.title,
      message: template.message,
      entityType: 'PAYMENT',
      entityId: paymentId,
      actionUrl: template.actionUrl,
      metadata: template.metadata,
      deduplicationKey,
      sourceModule: 'payments',
    });
  },

  /**
   * Shipping Events Integration
   */
  async notifyShipmentEvent(
    userId: string,
    orderId: string,
    orderNumber: string,
    shipmentId: string,
    shipmentStatus: string,
    trackingNumber?: string,
    carrierName?: string
  ): Promise<void> {
    const template = notificationTemplateService.formatShipmentNotification(
      orderNumber,
      orderId,
      shipmentStatus,
      trackingNumber,
      carrierName
    );

    const deduplicationKey = `shipment:${shipmentId}:${shipmentStatus.toLowerCase()}`;

    await this.createNotification({
      userId,
      type: template.type,
      category: template.category,
      title: template.title,
      message: template.message,
      entityType: 'SHIPMENT',
      entityId: shipmentId,
      actionUrl: template.actionUrl,
      metadata: template.metadata,
      deduplicationKey,
      sourceModule: 'shipping',
    });
  },

  /**
   * Review Events Integration
   */
  async notifyReviewEvent(
    userId: string,
    reviewId: string,
    productName: string,
    status: string,
    moderationReason?: string
  ): Promise<void> {
    const template = notificationTemplateService.formatReviewNotification(
      productName,
      status,
      moderationReason
    );

    const deduplicationKey = `review:${reviewId}:${status.toLowerCase()}`;

    await this.createNotification({
      userId,
      type: template.type,
      category: template.category,
      title: template.title,
      message: template.message,
      entityType: 'REVIEW',
      entityId: reviewId,
      actionUrl: template.actionUrl,
      metadata: template.metadata,
      deduplicationKey,
      sourceModule: 'reviews',
    });
  },

  /**
   * Return Events Integration
   */
  async notifyReturnEvent(
    userId: string,
    returnId: string,
    returnNumber: string,
    status: string,
    reason?: string
  ): Promise<void> {
    const template = notificationTemplateService.formatReturnNotification(
      returnNumber,
      returnId,
      status,
      reason
    );

    const deduplicationKey = `return:${returnId}:${status.toLowerCase()}`;

    await this.createNotification({
      userId,
      type: template.type,
      category: template.category,
      title: template.title,
      message: template.message,
      entityType: 'RETURN',
      entityId: returnId,
      actionUrl: template.actionUrl,
      metadata: template.metadata,
      deduplicationKey,
      sourceModule: 'returns',
    });
  },

  /**
   * Refund Events Integration
   */
  async notifyRefundEvent(
    userId: string,
    refundId: string,
    refundNumber: string,
    status: string,
    amount?: number,
    currency?: string
  ): Promise<void> {
    const template = notificationTemplateService.formatRefundNotification(
      refundNumber,
      refundId,
      status,
      amount,
      currency
    );

    const deduplicationKey = `refund:${refundId}:${status.toLowerCase()}`;

    await this.createNotification({
      userId,
      type: template.type,
      category: template.category,
      title: template.title,
      message: template.message,
      entityType: 'REFUND',
      entityId: refundId,
      actionUrl: template.actionUrl,
      metadata: template.metadata,
      deduplicationKey,
      sourceModule: 'refunds',
    });
  },

  /**
   * Low Stock Events Integration (Staff Notifications)
   */
  async notifyLowStockEvent(
    productName: string,
    sku: string,
    variantId: string,
    availableStock: number,
    threshold: number
  ): Promise<void> {
    const template = notificationTemplateService.formatLowStockNotification(
      productName,
      sku,
      availableStock,
      threshold
    );

    // Notify staff users with inventory update/manage permissions
    const staffUserIds =
      await notificationRecipientService.findStaffUsersWithPermission(
        PERMISSIONS.INVENTORY_UPDATE
      );

    const stateKey = availableStock <= 0 ? 'out_of_stock' : 'low_stock';

    for (const staffId of staffUserIds) {
      const deduplicationKey = `admin:${staffId}:inv:${variantId}:${stateKey}`;

      await this.createNotification({
        userId: staffId,
        type: template.type,
        category: template.category,
        title: template.title,
        message: template.message,
        entityType: 'INVENTORY',
        entityId: variantId,
        actionUrl: template.actionUrl,
        metadata: template.metadata,
        deduplicationKey,
        sourceModule: 'inventory',
      });
    }
  },
};
