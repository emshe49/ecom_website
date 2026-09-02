import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { EmailMessage } from '../src/modules/email/email-message.model.js';
import { EmailAttempt } from '../src/modules/email/email-attempt.model.js';
import { EmailPreference } from '../src/modules/email/email-preference.model.js';
import { emailService } from '../src/modules/email/email.service.js';
import { TEMPLATES } from '../src/modules/email/email-template-registry.js';
import { EMAIL_STATUS } from '../src/modules/email/email.constants.js';
import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';
import { User } from '../src/modules/users/user.model.js';

const app = createApp();

describe('Email Module', () => {
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;

  beforeAll(async () => {
    const testDbUri = env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testDbUri);
    }

    // Setup Admin
    const admin = await User.create({
      email: 'admin_email_test@example.com',
      passwordHash: 'hashedpassword',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isEmailVerified: true
    });
    adminId = admin._id.toString();
    adminToken = generateAccessToken({ sub: adminId, role: 'ADMIN', email: admin.email });

    // Setup User
    const user = await User.create({
      email: 'user_email_test@example.com',
      passwordHash: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      role: 'CUSTOMER',
      isEmailVerified: true
    });
    userId = user._id.toString();
    userToken = generateAccessToken({ sub: userId, role: 'CUSTOMER', email: user.email });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['admin_email_test@example.com', 'user_email_test@example.com'] } });
    await EmailMessage.deleteMany({});
    await EmailAttempt.deleteMany({});
    await EmailPreference.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Core Service: sendTransactionalEmail', () => {
    it('should successfully send an email using the test provider', async () => {
      const result = await emailService.sendTransactionalEmail({
        recipient: 'test@example.com',
        templateId: TEMPLATES.AUTH_VERIFY_EMAIL.id,
        data: { url: 'http://localhost/verify' },
        deduplicationKey: 'verify-1234'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      const message = await EmailMessage.findById(result.messageId);
      expect(message).toBeDefined();
      expect(message?.status).toBe(EMAIL_STATUS.SENT);
      expect(message?.attemptCount).toBe(1);

      const attempts = await EmailAttempt.find({ emailMessageId: result.messageId });
      expect(attempts.length).toBe(1);
      expect(attempts[0].status).toBe(EMAIL_STATUS.SENT);
    });

    it('should deduplicate if the same deduplicationKey is provided', async () => {
      const result = await emailService.sendTransactionalEmail({
        recipient: 'test@example.com',
        templateId: TEMPLATES.AUTH_VERIFY_EMAIL.id,
        data: { url: 'http://localhost/verify' },
        deduplicationKey: 'verify-1234' // Same key as above
      });

      expect(result.success).toBe(true);
      expect(result.deduplicated).toBe(true);
      
      const count = await EmailMessage.countDocuments({ deduplicationKey: 'verify-1234' });
      expect(count).toBe(1); // Only one message should exist
    });

    it('should fail elegantly if template data is invalid', async () => {
      await expect(
        emailService.sendTransactionalEmail({
          recipient: 'test@example.com',
          templateId: TEMPLATES.AUTH_VERIFY_EMAIL.id,
          data: { wrongKey: 'missing_url' }
        })
      ).rejects.toThrow('Template data validation failed');
    });
  });

  describe('Preferences', () => {
    it('should allow user to update preferences', async () => {
      const res = await request(app)
        .put('/api/v1/email/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ marketing: true, orders: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.marketing).toBe(true);
      expect(res.body.data.orders).toBe(false);
    });

    it('should respect user preferences for non-critical emails', async () => {
      const result = await emailService.sendTransactionalEmail({
        userId,
        recipient: 'user_email_test@example.com',
        templateId: TEMPLATES.ORDER_PLACED.id,
        data: { orderNumber: '123', customerName: 'Test', total: 100, currency: 'USD', orderUrl: 'http://localhost' },
        category: 'orders', // User disabled this in previous test
        deduplicationKey: 'order-123'
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Preference disabled');
      
      const count = await EmailMessage.countDocuments({ deduplicationKey: 'order-123' });
      expect(count).toBe(0); // Should not have created a message
    });
  });

  describe('Admin Endpoints', () => {
    it('should list emails', async () => {
      const res = await request(app)
        .get('/api/v1/admin/email/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBeGreaterThan(0);
    });

    it('should get email details', async () => {
      const message = await EmailMessage.findOne();
      
      const res = await request(app)
        .get(`/api/v1/admin/email/messages/${message?._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(message?._id.toString());
      expect(Array.isArray(res.body.data.attempts)).toBe(true);
    });
  });
});
