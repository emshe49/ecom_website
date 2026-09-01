import { Request, Response, NextFunction } from 'express';
import { notificationQueryService } from './notification-query.service.js';
import {
  notificationQuerySchema,
  markNotificationReadSchema,
  updatePreferenceSchema,
} from './notification.validation.js';

export const notificationController = {
  /**
   * GET /api/v1/notifications
   */
  async getNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = notificationQuerySchema.parse(req.query);
      const result = await notificationQueryService.getUserNotifications(
        req.user!.id,
        query
      );

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const count = await notificationQueryService.getUnreadCount(req.user!.id);
      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/notifications/:notificationId/read
   */
  async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const params = markNotificationReadSchema.parse(req.params);
      const updated = await notificationQueryService.markAsRead(
        req.user!.id,
        params.notificationId
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/notifications/read-all
   */
  async markAllAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await notificationQueryService.markAllAsRead(
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/notifications/preferences
   */
  async getPreferences(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const preferences = await notificationQueryService.getUserPreferences(
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/notifications/preferences
   */
  async updatePreferences(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const body = updatePreferenceSchema.parse(req.body);
      const updated = await notificationQueryService.updateUserPreferences(
        req.user!.id,
        body
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },
};
