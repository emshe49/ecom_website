import { NotificationType, NotificationCategory } from './notification.constants.js';

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPreferenceDTO {
  orders: boolean;
  payments: boolean;
  shipping: boolean;
  reviews: boolean;
  returns: boolean;
  refunds: boolean;
  promotions: boolean;
  inventory: boolean;
  system: boolean;
  updatedAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  deduplicationKey?: string | null;
  sourceModule?: string | null;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  status?: 'unread' | 'read';
  category?: NotificationCategory;
}

export interface UpdatePreferenceInput {
  orders?: boolean;
  payments?: boolean;
  shipping?: boolean;
  reviews?: boolean;
  returns?: boolean;
  refunds?: boolean;
  promotions?: boolean;
  inventory?: boolean;
  system?: boolean;
}
