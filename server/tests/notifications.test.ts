import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { NotificationPreference } from '../src/modules/notifications/notification-preference.model.js';
import { notificationService } from '../src/modules/notifications/notification.service.js';
import { notificationQueryService } from '../src/modules/notifications/notification-query.service.js';
import { notificationTemplateService } from '../src/modules/notifications/notification-template.service.js';
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_CATEGORY,
} from '../src/modules/notifications/notification.constants.js';
import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import { ErrorCodes } from '../src/shared/errors/error-codes.js';

describe('Module 18: In-App Notifications Integration & Security Tests', () => {
  let app: any;
  let customerA: any;
  let customerAToken: string;
  let customerB: any;
  let customerBToken: string;
  let warehouseStaff: any;
  let warehouseStaffToken: string;
  let superAdmin: any;
  let superAdminToken: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    app = createApp();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await NotificationPreference.deleteMany({});
    await User.deleteMany({
      email: {
        $in: [
          'notif_customer_a@example.com',
          'notif_customer_b@example.com',
          'notif_staff@example.com',
          'notif_admin@example.com',
        ],
      },
    });

    customerA = await User.create({
      email: 'notif_customer_a@example.com',
      passwordHash: 'ValidPasswordHash123!',
      firstName: 'Alice',
      lastName: 'Customer',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerAToken = generateAccessToken({
      sub: customerA._id.toString(),
      email: customerA.email,
      role: customerA.role,
    });

    customerB = await User.create({
      email: 'notif_customer_b@example.com',
      passwordHash: 'ValidPasswordHash123!',
      firstName: 'Bob',
      lastName: 'Customer',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerBToken = generateAccessToken({
      sub: customerB._id.toString(),
      email: customerB.email,
      role: customerB.role,
    });

    warehouseStaff = await User.create({
      email: 'notif_staff@example.com',
      passwordHash: 'ValidPasswordHash123!',
      firstName: 'Wendy',
      lastName: 'Warehouse',
      role: ROLES.WAREHOUSE_STAFF,
      isEmailVerified: true,
      isActive: true,
    });
    warehouseStaffToken = generateAccessToken({
      sub: warehouseStaff._id.toString(),
      email: warehouseStaff.email,
      role: warehouseStaff.role,
    });

    superAdmin = await User.create({
      email: 'notif_admin@example.com',
      passwordHash: 'ValidPasswordHash123!',
      firstName: 'Sam',
      lastName: 'Admin',
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    superAdminToken = generateAccessToken({
      sub: superAdmin._id.toString(),
      email: superAdmin.email,
      role: superAdmin.role,
    });
  });

  // 1. Data Model & Deduplication Uniqueness
  describe('Notification Model & Deduplication', () => {
    it('creates notification with valid fields and compound index structure', async () => {
      const notif = await Notification.create({
        userId: customerA._id,
        type: NOTIFICATION_TYPE.ORDER_PLACED,
        category: NOTIFICATION_CATEGORY.ORDER,
        title: 'Order Placed',
        message: 'Your order ORD-2026-0001 has been placed successfully.',
        actionUrl: '/orders/123456',
        entityType: 'ORDER',
        entityId: '123456',
        metadata: { orderNumber: 'ORD-2026-0001' },
        deduplicationKey: 'order:123456:placed',
        sourceModule: 'orders',
      });

      expect(notif._id).toBeDefined();
      expect(notif.readAt).toBeNull();
      expect(notif.title).toBe('Order Placed');
    });

    it('NOTIFY-SEC-08: prevents duplicate notifications via deduplicationKey and returns existing document', async () => {
      const orderId = new Types.ObjectId().toString();
      const dedupKey = `order:${orderId}:placed`;

      const notif1 = await notificationService.createNotification({
        userId: customerA._id.toString(),
        type: NOTIFICATION_TYPE.ORDER_PLACED,
        category: NOTIFICATION_CATEGORY.ORDER,
        title: 'Order Placed',
        message: 'Your order ORD-0001 has been placed.',
        deduplicationKey: dedupKey,
      });

      const notif2 = await notificationService.createNotification({
        userId: customerA._id.toString(),
        type: NOTIFICATION_TYPE.ORDER_PLACED,
        category: NOTIFICATION_CATEGORY.ORDER,
        title: 'Order Placed (Retry)',
        message: 'Your order ORD-0001 has been placed retry.',
        deduplicationKey: dedupKey,
      });

      expect(notif1).not.toBeNull();
      expect(notif2).not.toBeNull();
      expect(notif1?._id.toString()).toBe(notif2?._id.toString());

      const count = await Notification.countDocuments({
        userId: customerA._id,
        deduplicationKey: dedupKey,
      });
      expect(count).toBe(1);
    });
  });

  // 2. Customer Notification APIs & IDOR Prevention
  describe('Customer Notification Listing & IDOR (NOTIFY-SEC-01, NOTIFY-SEC-04)', () => {
    beforeEach(async () => {
      // Create 3 notifications for Customer A
      await Notification.create([
        {
          userId: customerA._id,
          type: NOTIFICATION_TYPE.ORDER_PLACED,
          category: NOTIFICATION_CATEGORY.ORDER,
          title: 'Order 1 Placed',
          message: 'Order 1 placed',
        },
        {
          userId: customerA._id,
          type: NOTIFICATION_TYPE.PAYMENT_SUCCEEDED,
          category: NOTIFICATION_CATEGORY.PAYMENT,
          title: 'Payment 1 Received',
          message: 'Payment received',
        },
        {
          userId: customerA._id,
          type: NOTIFICATION_TYPE.SHIPMENT_SHIPPED,
          category: NOTIFICATION_CATEGORY.SHIPPING,
          title: 'Order 1 Shipped',
          message: 'Order shipped',
          readAt: new Date(),
        },
      ]);

      // Create 2 notifications for Customer B
      await Notification.create([
        {
          userId: customerB._id,
          type: NOTIFICATION_TYPE.ORDER_PLACED,
          category: NOTIFICATION_CATEGORY.ORDER,
          title: 'Customer B Order Placed',
          message: 'Customer B order placed',
        },
        {
          userId: customerB._id,
          type: NOTIFICATION_TYPE.REVIEW_PUBLISHED,
          category: NOTIFICATION_CATEGORY.REVIEW,
          title: 'Customer B Review Published',
          message: 'Review published',
        },
      ]);
    });

    it('NOTIFY-SEC-01 & NOTIFY-SEC-04: Customer A only retrieves their own notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.pagination.total).toBe(3);

      // Verify none of Customer B's notifications are returned
      const titles = res.body.data.map((n: any) => n.title);
      expect(titles).not.toContain('Customer B Order Placed');
      expect(titles).toContain('Order 1 Placed');
    });

    it('filters notifications by status (unread vs read)', async () => {
      const unreadRes = await request(app)
        .get('/api/v1/notifications?status=unread')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(unreadRes.status).toBe(200);
      expect(unreadRes.body.data.length).toBe(2);
      expect(unreadRes.body.data.every((n: any) => n.read === false)).toBe(true);

      const readRes = await request(app)
        .get('/api/v1/notifications?status=read')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.length).toBe(1);
      expect(readRes.body.data[0].read).toBe(true);
    });

    it('filters notifications by category', async () => {
      const orderRes = await request(app)
        .get('/api/v1/notifications?category=ORDER')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(orderRes.status).toBe(200);
      expect(orderRes.body.data.length).toBe(1);
      expect(orderRes.body.data[0].category).toBe('ORDER');
    });

    it('supports pagination metadata', async () => {
      const pageRes = await request(app)
        .get('/api/v1/notifications?page=1&limit=2')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(pageRes.status).toBe(200);
      expect(pageRes.body.data.length).toBe(2);
      expect(pageRes.body.pagination.page).toBe(1);
      expect(pageRes.body.pagination.limit).toBe(2);
      expect(pageRes.body.pagination.total).toBe(3);
      expect(pageRes.body.pagination.pages).toBe(2);
      expect(pageRes.body.pagination.hasNextPage).toBe(true);
      expect(pageRes.body.pagination.hasPrevPage).toBe(false);
    });
  });

  // 3. Unread Count API
  describe('Unread Count Calculation', () => {
    it('returns accurate unread count for current user', async () => {
      await Notification.create([
        {
          userId: customerA._id,
          type: NOTIFICATION_TYPE.ORDER_PLACED,
          category: NOTIFICATION_CATEGORY.ORDER,
          title: 'Notif 1',
          message: 'Msg 1',
          readAt: null,
        },
        {
          userId: customerA._id,
          type: NOTIFICATION_TYPE.ORDER_CONFIRMED,
          category: NOTIFICATION_CATEGORY.ORDER,
          title: 'Notif 2',
          message: 'Msg 2',
          readAt: null,
        },
        {
          userId: customerA._id,
          type: NOTIFICATION_TYPE.ORDER_SHIPPED,
          category: NOTIFICATION_CATEGORY.SHIPPING,
          title: 'Notif 3',
          message: 'Msg 3',
          readAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2);
    });
  });

  // 4. Mark As Read & Mark All As Read
  describe('Mark Read & Mark All Read (NOTIFY-SEC-02)', () => {
    let notifA: any;
    let notifB: any;

    beforeEach(async () => {
      notifA = await Notification.create({
        userId: customerA._id,
        type: NOTIFICATION_TYPE.ORDER_PLACED,
        category: NOTIFICATION_CATEGORY.ORDER,
        title: 'Customer A Notification',
        message: 'Order placed for A',
        readAt: null,
      });

      notifB = await Notification.create({
        userId: customerB._id,
        type: NOTIFICATION_TYPE.ORDER_PLACED,
        category: NOTIFICATION_CATEGORY.ORDER,
        title: 'Customer B Notification',
        message: 'Order placed for B',
        readAt: null,
      });
    });

    it('NOTIFY-SEC-02: marks own notification as read and sets readAt', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${notifA._id.toString()}/read`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.read).toBe(true);
      expect(res.body.data.readAt).not.toBeNull();

      const updated = await Notification.findById(notifA._id);
      expect(updated?.readAt).not.toBeNull();
    });

    it('is idempotent when markAsRead is called multiple times', async () => {
      await request(app)
        .patch(`/api/v1/notifications/${notifA._id.toString()}/read`)
        .set('Authorization', `Bearer ${customerAToken}`);

      const res2 = await request(app)
        .patch(`/api/v1/notifications/${notifA._id.toString()}/read`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.read).toBe(true);
    });

    it('NOTIFY-SEC-02: rejects cross-user mark read attempts with 404', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${notifB._id.toString()}/read`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_NOTIFICATION_NOT_FOUND);

      // Verify Customer B notification is still unread
      const untouched = await Notification.findById(notifB._id);
      expect(untouched?.readAt).toBeNull();
    });

    it('marks all unread notifications as read for current user only', async () => {
      await Notification.create({
        userId: customerA._id,
        type: NOTIFICATION_TYPE.PAYMENT_SUCCEEDED,
        category: NOTIFICATION_CATEGORY.PAYMENT,
        title: 'Payment 2',
        message: 'Payment 2 message',
        readAt: null,
      });

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.modifiedCount).toBe(2);

      const unreadCountA = await Notification.countDocuments({
        userId: customerA._id,
        readAt: null,
      });
      expect(unreadCountA).toBe(0);

      // Customer B unread notification remains untouched
      const unreadCountB = await Notification.countDocuments({
        userId: customerB._id,
        readAt: null,
      });
      expect(unreadCountB).toBe(1);
    });
  });

  // 5. Security & Validation (NOTIFY-SEC-03, NOTIFY-SEC-05, NOTIFY-SEC-06, NOTIFY-SEC-07)
  describe('Security & Data Protection', () => {
    it('NOTIFY-SEC-03: rejects client attempts to POST arbitrary notifications', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          title: 'Fake Notification',
          message: 'Customer forged message',
        });

      // No public POST route exists on /api/v1/notifications
      expect(res.status).toBe(404);
    });

    it('NOTIFY-SEC-05: notification metadata never contains sensitive tokens, passwords, or card numbers', async () => {
      const paymentTemplate = notificationTemplateService.formatPaymentNotification(
        'ORD-2026-999',
        'order123',
        'PAID',
        2500,
        'USD'
      );

      expect(paymentTemplate.metadata).not.toHaveProperty('cardNumber');
      expect(paymentTemplate.metadata).not.toHaveProperty('cvv');
      expect(paymentTemplate.metadata).not.toHaveProperty('secret');
      expect(paymentTemplate.metadata).not.toHaveProperty('accessToken');
      expect(paymentTemplate.metadata).not.toHaveProperty('password');
      expect(paymentTemplate.metadata).toHaveProperty('orderNumber', 'ORD-2026-999');
    });

    it('NOTIFY-SEC-06: sanitizes HTML from title and message to render plain text', () => {
      const raw = '<script>alert("XSS")</script><b>Order Placed!</b>';
      const sanitized = notificationTemplateService.sanitizeText(raw, 100);

      expect(sanitized).toBe('alert("XSS")Order Placed!');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<b>');
    });

    it('NOTIFY-SEC-07: formats safe internal action URLs', () => {
      const orderTemplate = notificationTemplateService.formatOrderNotification(
        'ORD-001',
        'CONFIRMED',
        '65f123456789012345678901'
      );
      expect(orderTemplate.actionUrl).toBe('/orders/65f123456789012345678901');
      expect(orderTemplate.actionUrl.startsWith('/')).toBe(true);

      const reviewTemplate = notificationTemplateService.formatReviewNotification(
        'Product Name',
        'HIDDEN',
        'Inappropriate content'
      );
      expect(reviewTemplate.actionUrl).toBe('/account/reviews');
    });
  });

  // 6. Domain Event Dispatchers & Webhook Replay Protection
  describe('Domain Events & Webhook Replay (NOTIFY-SEC-08, NOTIFY-SEC-09, NOTIFY-SEC-10)', () => {
    it('notifies on order events and deduplicates duplicate status events', async () => {
      const orderId = new Types.ObjectId().toString();

      await notificationService.notifyOrderEvent(
        customerA._id.toString(),
        orderId,
        'ORD-1001',
        'PLACED'
      );

      // Replay order placed event
      await notificationService.notifyOrderEvent(
        customerA._id.toString(),
        orderId,
        'ORD-1001',
        'PLACED'
      );

      const notifs = await Notification.find({
        userId: customerA._id,
        entityId: orderId,
      });

      expect(notifs.length).toBe(1);
      expect(notifs[0].type).toBe(NOTIFICATION_TYPE.ORDER_PLACED);
      expect(notifs[0].title).toBe('Order Placed');
    });

    it('notifies on payment success and prevents duplicate notifications on webhook replay', async () => {
      const orderId = new Types.ObjectId().toString();
      const paymentId = new Types.ObjectId().toString();

      // First payment webhook
      await notificationService.notifyPaymentEvent(
        customerA._id.toString(),
        orderId,
        'ORD-1002',
        paymentId,
        'SUCCEEDED',
        1500,
        'USD'
      );

      // Replayed payment webhook
      await notificationService.notifyPaymentEvent(
        customerA._id.toString(),
        orderId,
        'ORD-1002',
        paymentId,
        'SUCCEEDED',
        1500,
        'USD'
      );

      const notifs = await Notification.find({
        userId: customerA._id,
        entityId: paymentId,
      });

      expect(notifs.length).toBe(1);
      expect(notifs[0].type).toBe(NOTIFICATION_TYPE.PAYMENT_SUCCEEDED);
      expect(notifs[0].title).toBe('Payment Successful');
    });

    it('notifies on payment attempt failure with attemptId deduplication', async () => {
      const orderId = new Types.ObjectId().toString();
      const paymentId = new Types.ObjectId().toString();
      const attemptId = new Types.ObjectId().toString();

      await notificationService.notifyPaymentEvent(
        customerA._id.toString(),
        orderId,
        'ORD-1003',
        paymentId,
        'FAILED',
        1500,
        'USD',
        attemptId
      );

      const notif = await Notification.findOne({
        userId: customerA._id,
        deduplicationKey: `payment-attempt:${attemptId}:failed`,
      });

      expect(notif).not.toBeNull();
      expect(notif?.type).toBe(NOTIFICATION_TYPE.PAYMENT_FAILED);
      expect(notif?.title).toBe('Payment Failed');
    });

    it('notifies on shipment status milestones (SHIPPED, OUT_FOR_DELIVERY, DELIVERED)', async () => {
      const orderId = new Types.ObjectId().toString();
      const shipmentId = new Types.ObjectId().toString();

      await notificationService.notifyShipmentEvent(
        customerA._id.toString(),
        orderId,
        'ORD-1004',
        shipmentId,
        'SHIPPED',
        'TRK123456',
        'FedEx'
      );

      await notificationService.notifyShipmentEvent(
        customerA._id.toString(),
        orderId,
        'ORD-1004',
        shipmentId,
        'OUT_FOR_DELIVERY',
        'TRK123456',
        'FedEx'
      );

      await notificationService.notifyShipmentEvent(
        customerA._id.toString(),
        orderId,
        'ORD-1004',
        shipmentId,
        'DELIVERED',
        'TRK123456',
        'FedEx'
      );

      const notifs = await Notification.find({
        userId: customerA._id,
        entityId: shipmentId,
      }).sort({ createdAt: 1 });

      expect(notifs.length).toBe(3);
      expect(notifs[0].type).toBe(NOTIFICATION_TYPE.SHIPMENT_SHIPPED);
      expect(notifs[1].type).toBe(NOTIFICATION_TYPE.SHIPMENT_OUT_FOR_DELIVERY);
      expect(notifs[2].type).toBe(NOTIFICATION_TYPE.SHIPMENT_DELIVERED);
    });

    it('notifies on review moderation outcomes (HIDDEN, REJECTED)', async () => {
      const reviewId = new Types.ObjectId().toString();

      await notificationService.notifyReviewEvent(
        customerA._id.toString(),
        reviewId,
        'Premium Wireless Headphones',
        'HIDDEN',
        'Contains external advertisement links'
      );

      const notif = await Notification.findOne({
        userId: customerA._id,
        entityId: reviewId,
      });

      expect(notif).not.toBeNull();
      expect(notif?.type).toBe(NOTIFICATION_TYPE.REVIEW_HIDDEN);
      expect(notif?.message).toContain('Contains external advertisement links');
    });

    it('NOTIFY-SEC-10: low stock alerts notify authorized staff with inventory permission', async () => {
      const variantId = new Types.ObjectId().toString();

      await notificationService.notifyLowStockEvent(
        'Gaming Laptop',
        'LAPTOP-G1-BLK',
        variantId,
        2,
        5
      );

      // Super admin has INVENTORY_UPDATE permission
      const adminNotif = await Notification.findOne({
        userId: superAdmin._id,
        entityId: variantId,
      });
      expect(adminNotif).not.toBeNull();
      expect(adminNotif?.type).toBe(NOTIFICATION_TYPE.LOW_STOCK_ALERT);

      // Customer A should NOT receive internal inventory alerts
      const customerNotif = await Notification.findOne({
        userId: customerA._id,
        entityId: variantId,
      });
      expect(customerNotif).toBeNull();
    });
  });

  // 7. Notification Preferences
  describe('Notification Preferences & Tampering (NOTIFY-SEC-01)', () => {
    it('retrieves default notification preferences for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders).toBe(true);
      expect(res.body.data.payments).toBe(true);
      expect(res.body.data.promotions).toBe(false);
    });

    it('updates user notification preferences', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          promotions: true,
          shipping: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.promotions).toBe(true);
      expect(res.body.data.shipping).toBe(false);

      const pref = await NotificationPreference.findOne({ userId: customerA._id });
      expect(pref?.promotions).toBe(true);
      expect(pref?.shipping).toBe(false);
    });

    it('rejects tampered preference payload containing unexpected properties', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          promotions: true,
          userId: customerB._id.toString(),
          role: 'SUPER_ADMIN',
          email: 'hacker@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });
  });
});
