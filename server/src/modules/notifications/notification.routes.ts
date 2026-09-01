import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Customer notification endpoints
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:notificationId/read', notificationController.markAsRead);

// Notification preferences endpoints
router.get('/preferences', notificationController.getPreferences);
router.patch('/preferences', notificationController.updatePreferences);

export default router;
