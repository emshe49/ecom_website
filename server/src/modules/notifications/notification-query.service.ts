import { Types, FilterQuery } from 'mongoose';
import { Notification, NotificationDocument } from './notification.model.js';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from './notification-preference.model.js';
import { notificationMapper } from './notification.mapper.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import {
  NotificationDTO,
  NotificationPreferenceDTO,
  NotificationQuery,
  UpdatePreferenceInput,
} from './notification.types.js';

export const notificationQueryService = {
  /**
   * Retrieves paginated notifications strictly scoped to the authenticated user.
   */
  async getUserNotifications(
    userId: string,
    query: NotificationQuery
  ): Promise<{
    data: NotificationDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<NotificationDocument> = {
      userId: new Types.ObjectId(userId),
    };

    if (query.status === 'unread') {
      filter.readAt = null;
    } else if (query.status === 'read') {
      filter.readAt = { $ne: null };
    }

    if (query.category) {
      filter.category = query.category;
    }

    const [total, docs] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return {
      data: (docs as unknown as NotificationDocument[]).map(
        notificationMapper.toDTO
      ),
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNextPage: page < pages,
        hasPrevPage: page > 1,
      },
    };
  },

  /**
   * Gets unread notifications count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      userId: new Types.ObjectId(userId),
      readAt: null,
    });
  },

  /**
   * Marks a single notification as read (idempotent, owner-scoped).
   */
  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<NotificationDTO> {
    const notification = await Notification.findOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw AppError.notFound(
        'Notification not found or access denied.',
        ErrorCodes.ERR_NOTIFICATION_NOT_FOUND
      );
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }

    return notificationMapper.toDTO(notification);
  },

  /**
   * Marks all unread notifications for a user as read.
   */
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await Notification.updateMany(
      {
        userId: new Types.ObjectId(userId),
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      }
    );

    return { modifiedCount: result.modifiedCount };
  },

  /**
   * Gets user notification preferences or creates defaults.
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferenceDTO> {
    let preference = await NotificationPreference.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!preference) {
      preference = await NotificationPreference.create({
        userId: new Types.ObjectId(userId),
      });
    }

    return notificationMapper.toPreferenceDTO(preference);
  },

  /**
   * Updates user notification preferences.
   */
  async updateUserPreferences(
    userId: string,
    patch: UpdatePreferenceInput
  ): Promise<NotificationPreferenceDTO> {
    const preference = await NotificationPreference.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: patch },
      { new: true, upsert: true, runValidators: true }
    );

    return notificationMapper.toPreferenceDTO(preference);
  },
};
