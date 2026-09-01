import api from '../../../services/api';
import {
  NotificationItem,
  NotificationPreference,
  NotificationQuery,
  NotificationListResponse,
} from '../types/notifications.types';

export const notificationsApi = {
  /**
   * Retrieves paginated notifications for current authenticated user
   */
  getNotifications: async (
    params?: NotificationQuery
  ): Promise<NotificationListResponse> => {
    const response = await api.get<{
      success: boolean;
      data: NotificationItem[];
      pagination: NotificationListResponse['pagination'];
    }>('/notifications', { params });

    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /**
   * Retrieves unread notifications count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{
      success: boolean;
      data: { count: number };
    }>('/notifications/unread-count');
    return response.data.data.count;
  },

  /**
   * Marks a single notification as read
   */
  markAsRead: async (notificationId: string): Promise<NotificationItem> => {
    const response = await api.patch<{
      success: boolean;
      data: NotificationItem;
    }>(`/notifications/${notificationId}/read`);
    return response.data.data;
  },

  /**
   * Marks all unread notifications for current user as read
   */
  markAllAsRead: async (): Promise<{ modifiedCount: number }> => {
    const response = await api.patch<{
      success: boolean;
      data: { modifiedCount: number };
    }>('/notifications/read-all');
    return response.data.data;
  },

  /**
   * Retrieves user notification preferences
   */
  getPreferences: async (): Promise<NotificationPreference> => {
    const response = await api.get<{
      success: boolean;
      data: NotificationPreference;
    }>('/notifications/preferences');
    return response.data.data;
  },

  /**
   * Updates user notification preferences
   */
  updatePreferences: async (
    patch: Partial<Omit<NotificationPreference, 'updatedAt'>>
  ): Promise<NotificationPreference> => {
    const response = await api.patch<{
      success: boolean;
      data: NotificationPreference;
    }>('/notifications/preferences', patch);
    return response.data.data;
  },
};
