import { NotificationDocument } from './notification.model.js';
import { NotificationPreferenceDocument } from './notification-preference.model.js';
import { NotificationDTO, NotificationPreferenceDTO } from './notification.types.js';

export const notificationMapper = {
  toDTO(doc: NotificationDocument): NotificationDTO {
    return {
      id: doc._id.toString(),
      type: doc.type,
      category: doc.category,
      title: doc.title,
      message: doc.message,
      read: !!doc.readAt,
      readAt: doc.readAt ? doc.readAt.toISOString() : null,
      entityType: doc.entityType,
      entityId: doc.entityId,
      actionUrl: doc.actionUrl,
      metadata: doc.metadata || null,
      createdAt: doc.createdAt.toISOString(),
    };
  },

  toPreferenceDTO(doc: NotificationPreferenceDocument): NotificationPreferenceDTO {
    return {
      orders: doc.orders,
      payments: doc.payments,
      shipping: doc.shipping,
      reviews: doc.reviews,
      returns: doc.returns,
      refunds: doc.refunds,
      promotions: doc.promotions,
      inventory: doc.inventory,
      system: doc.system,
      updatedAt: doc.updatedAt.toISOString(),
    };
  },
};
