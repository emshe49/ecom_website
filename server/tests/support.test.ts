import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { SupportTicket } from '../src/modules/support/support-ticket.model.js';
import { SupportMessage } from '../src/modules/support/support-message.model.js';
import { SupportTicketHistory } from '../src/modules/support/support-history.model.js';
import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/modules/orders/order.constants.js';

const app = createApp();

describe('Module 22: Customer Support & Ticket Management', () => {
  let adminToken: string;
  let supportStaffToken: string;
  let customerAToken: string;
  let customerBToken: string;

  let adminUserId: string;
  let supportStaffUserId: string;
  let customerAUserId: string;
  let customerBUserId: string;

  let customerAOrderId: string;
  let customerBOrderId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    // Clean up test data
    await User.deleteMany({
      email: {
        $in: [
          'support_admin@example.com',
          'support_agent@example.com',
          'support_cust_a@example.com',
          'support_cust_b@example.com',
        ],
      },
    });
    await Order.deleteMany({
      'customerSnapshot.email': {
        $in: ['support_cust_a@example.com', 'support_cust_b@example.com'],
      },
    });
    await SupportTicket.deleteMany({});
    await SupportMessage.deleteMany({});
    await SupportTicketHistory.deleteMany({});

    // 1. Create Users
    const admin = await User.create({
      email: 'support_admin@example.com',
      passwordHash: 'hashed_secret_admin',
      firstName: 'Admin',
      lastName: 'Support',
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    });
    adminUserId = admin._id.toString();
    adminToken = generateAccessToken({
      sub: adminUserId,
      email: admin.email,
      role: 'ADMIN',
    });

    const staff = await User.create({
      email: 'support_agent@example.com',
      passwordHash: 'hashed_secret_staff',
      firstName: 'Agent',
      lastName: 'Smith',
      role: 'CUSTOMER_SUPPORT',
      isEmailVerified: true,
      isActive: true,
    });
    supportStaffUserId = staff._id.toString();
    supportStaffToken = generateAccessToken({
      sub: supportStaffUserId,
      email: staff.email,
      role: 'CUSTOMER_SUPPORT',
    });

    const custA = await User.create({
      email: 'support_cust_a@example.com',
      passwordHash: 'hashed_secret_cust_a',
      firstName: 'Alice',
      lastName: 'Customer',
      role: 'CUSTOMER',
      isEmailVerified: true,
      isActive: true,
    });
    customerAUserId = custA._id.toString();
    customerAToken = generateAccessToken({
      sub: customerAUserId,
      email: custA.email,
      role: 'CUSTOMER',
    });

    const custB = await User.create({
      email: 'support_cust_b@example.com',
      passwordHash: 'hashed_secret_cust_b',
      firstName: 'Bob',
      lastName: 'Customer',
      role: 'CUSTOMER',
      isEmailVerified: true,
      isActive: true,
    });
    customerBUserId = custB._id.toString();
    customerBToken = generateAccessToken({
      sub: customerBUserId,
      email: custB.email,
      role: 'CUSTOMER',
    });

    const mockAddressA = {
      sourceAddressId: new mongoose.Types.ObjectId(),
      fullName: 'Alice Customer',
      phone: '+1234567890',
      addressLine1: '123 Main St',
      city: 'City',
      stateProvince: 'State',
      postalCode: '12345',
      country: 'US',
    };

    const mockAddressB = {
      sourceAddressId: new mongoose.Types.ObjectId(),
      fullName: 'Bob Customer',
      phone: '+1987654321',
      addressLine1: '456 Elm St',
      city: 'City',
      stateProvince: 'State',
      postalCode: '67890',
      country: 'US',
    };

    const mockShippingMethod = {
      code: 'STANDARD',
      name: 'Standard Shipping',
      fee: 1000,
      currency: 'USD',
      estimatedMinDays: 2,
      estimatedMaxDays: 5,
    };

    // 2. Create Orders for IDOR testing
    const orderA = await Order.create({
      orderNumber: 'ORD-2026-TEST-A1',
      userId: custA._id,
      checkoutSessionId: new mongoose.Types.ObjectId(),
      customerSnapshot: {
        userId: custA._id,
        email: 'support_cust_a@example.com',
        firstName: 'Alice',
        lastName: 'Customer',
      },
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          variantId: new mongoose.Types.ObjectId(),
          productName: 'Item A',
          productSlug: 'item-a',
          sku: 'SKU-A1',
          variantAttributes: [],
          quantity: 1,
          unitPrice: 5000,
          lineTotal: 5000,
          discountAmount: 0,
          finalLineTotal: 5000,
        },
      ],
      subtotal: 5000,
      discountAmount: 0,
      shippingFee: 1000,
      total: 6000,
      currency: 'USD',
      status: ORDER_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.UNFULFILLED,
      shippingMethod: mockShippingMethod,
      shippingAddress: mockAddressA,
      billingAddress: mockAddressA,
      placedAt: new Date(),
    });
    customerAOrderId = orderA._id.toString();

    const orderB = await Order.create({
      orderNumber: 'ORD-2026-TEST-B1',
      userId: custB._id,
      checkoutSessionId: new mongoose.Types.ObjectId(),
      customerSnapshot: {
        userId: custB._id,
        email: 'support_cust_b@example.com',
        firstName: 'Bob',
        lastName: 'Customer',
      },
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          variantId: new mongoose.Types.ObjectId(),
          productName: 'Item B',
          productSlug: 'item-b',
          sku: 'SKU-B1',
          variantAttributes: [],
          quantity: 2,
          unitPrice: 3000,
          lineTotal: 6000,
          discountAmount: 0,
          finalLineTotal: 6000,
        },
      ],
      subtotal: 6000,
      discountAmount: 0,
      shippingFee: 1000,
      total: 7000,
      currency: 'USD',
      status: ORDER_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.UNFULFILLED,
      shippingMethod: mockShippingMethod,
      shippingAddress: mockAddressB,
      billingAddress: mockAddressB,
      placedAt: new Date(),
    });
    customerBOrderId = orderB._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          'support_admin@example.com',
          'support_agent@example.com',
          'support_cust_a@example.com',
          'support_cust_b@example.com',
        ],
      },
    });
    await Order.deleteMany({
      'customerSnapshot.email': {
        $in: ['support_cust_a@example.com', 'support_cust_b@example.com'],
      },
    });
    await SupportTicket.deleteMany({});
    await SupportMessage.deleteMany({});
    await SupportTicketHistory.deleteMany({});
  });

  let createdTicketId: string;
  let createdTicketNumber: string;

  describe('1. Customer Ticket Creation & Validation', () => {
    it('should reject unauthenticated ticket creation', async () => {
      const res = await request(app)
        .post('/api/v1/support/tickets')
        .send({
          subject: 'Need help with my package',
          category: 'ORDER',
          message: 'My order is delayed.',
        });
      expect(res.status).toBe(401);
    });

    it('should reject invalid category', async () => {
      const res = await request(app)
        .post('/api/v1/support/tickets')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          subject: 'Need help with my package',
          category: 'INVALID_CATEGORY',
          message: 'My order is delayed.',
        });
      expect(res.status).toBe(400);
    });

    it('should reject empty message or too short subject', async () => {
      const res = await request(app)
        .post('/api/v1/support/tickets')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          subject: 'Hi',
          category: 'ORDER',
          message: '  ',
        });
      expect(res.status).toBe(400);
    });

    it('should prevent IDOR when customer tries to link another customer order', async () => {
      const res = await request(app)
        .post('/api/v1/support/tickets')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          subject: 'Inquiry about order',
          category: 'ORDER',
          message: 'I want to know where my order is.',
          relatedOrderId: customerBOrderId, // Bob's order!
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_SUPPORT_RELATED_ENTITY_FORBIDDEN');
    });

    it('should reject client-side injection of priority or status (strict validation)', async () => {
      const res = await request(app)
        .post('/api/v1/support/tickets')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          subject: 'Inquiry regarding my order package',
          category: 'ORDER',
          message: 'Can you please check the tracking updates for this order?',
          priority: 'URGENT', // Injection attempt
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully create ticket with valid owned order link and default priority NORMAL', async () => {
      const res = await request(app)
        .post('/api/v1/support/tickets')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          subject: 'Inquiry regarding my order package',
          category: 'ORDER',
          message: 'Can you please check the tracking updates for this order?',
          relatedOrderId: customerAOrderId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      expect(res.body.data.priority).toBe('NORMAL'); // Default respected
      expect(res.body.data.status).toBe('OPEN'); // Default respected
      expect(res.body.data.relatedOrder).toBeDefined();
      expect(res.body.data.relatedOrder.orderNumber).toBe('ORD-2026-TEST-A1');
      expect(res.body.data.messages).toHaveLength(1);
      expect(res.body.data.messages[0].body).toBe(
        'Can you please check the tracking updates for this order?'
      );

      createdTicketId = res.body.data.id;
      createdTicketNumber = res.body.data.ticketNumber;
    });
  });

  describe('2. Customer Ticket Retrieval & IDOR Enforcement', () => {
    it('should prevent Customer B from viewing Customer A ticket', async () => {
      const res = await request(app)
        .get(`/api/v1/support/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_SUPPORT_TICKET_FORBIDDEN');
    });

    it('should allow Customer A to view their ticket detail', async () => {
      const res = await request(app)
        .get(`/api/v1/support/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdTicketId);
      expect(res.body.data.ticketNumber).toBe(createdTicketNumber);
      expect(res.body.data.status).toBe('OPEN');
    });

    it('should list customer tickets with filters and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/support/tickets?status=OPEN&category=ORDER&page=1&limit=10')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(createdTicketId);
      expect(res.body.pagination.totalItems).toBe(1);
    });
  });

  describe('3. Staff Queue & Ticket Management (RBAC & Controls)', () => {
    it('should reject non-staff from accessing admin support queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/support/tickets')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow support staff to view queue and filter by unassigned', async () => {
      const res = await request(app)
        .get('/api/v1/admin/support/tickets?unassigned=true')
        .set('Authorization', `Bearer ${supportStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const match = res.body.data.find((t: any) => t.id === createdTicketId);
      expect(match).toBeDefined();
      expect(match.assignedTo).toBeNull();
    });

    it('should allow staff to assign ticket to themselves (assign-to-me)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${createdTicketId}/assign-to-me`)
        .set('Authorization', `Bearer ${supportStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assignedTo).toBe(supportStaffUserId);
    });

    it('should return 409 conflict when another staff attempts atomic assign-to-me on an already assigned ticket', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${createdTicketId}/assign-to-me`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_SUPPORT_TICKET_ALREADY_ASSIGNED');
    });

    it('should allow staff to update priority to HIGH', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/support/tickets/${createdTicketId}/priority`)
        .set('Authorization', `Bearer ${supportStaffToken}`)
        .send({ priority: 'HIGH' });

      expect(res.status).toBe(200);
      expect(res.body.priority).toBe('HIGH');
    });
  });

  describe('4. Internal Notes Privacy (SUPPORT-SEC-05)', () => {
    it('should allow staff to post an internal note', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${createdTicketId}/internal-notes`)
        .set('Authorization', `Bearer ${supportStaffToken}`)
        .send({ message: 'Checked shipping partner API: package delayed in customs.' });

      expect(res.status).toBe(201);
      expect(res.body.data.messageType).toBe('INTERNAL_NOTE');
      expect(res.body.data.body).toContain('customs');
    });

    it('should display internal note in staff ticket detail along with audit history', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/support/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${supportStaffToken}`);

      expect(res.status).toBe(200);
      const internalNote = res.body.data.messages.find(
        (m: any) => m.messageType === 'INTERNAL_NOTE'
      );
      expect(internalNote).toBeDefined();
      expect(internalNote.body).toContain('customs');
      expect(res.body.data.history.length).toBeGreaterThanOrEqual(2); // ASSIGNED, PRIORITY_CHANGED
    });

    it('CRITICAL: Customer detail MUST NOT contain internal notes', async () => {
      const res = await request(app)
        .get(`/api/v1/support/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      const internalNote = res.body.data.messages.find(
        (m: any) => m.messageType === 'INTERNAL_NOTE'
      );
      expect(internalNote).toBeUndefined();
      expect(res.body.data.messages).toHaveLength(1); // Only customer initial message
    });
  });

  describe('5. Conversation Flow, Status Transitions & Resolution', () => {
    it('should allow staff to reply to customer -> status transitions to WAITING_FOR_CUSTOMER', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${createdTicketId}/messages`)
        .set('Authorization', `Bearer ${supportStaffToken}`)
        .send({ message: 'We have expedited your shipment with the carrier.' });

      expect(res.status).toBe(201);
      expect(res.body.data.messageType).toBe('MESSAGE');

      // Verify status transitioned
      const ticket = await SupportTicket.findById(createdTicketId);
      expect(ticket?.status).toBe('WAITING_FOR_CUSTOMER');
      expect(ticket?.customerUnreadCount).toBe(1);
    });

    it('should allow customer to view reply and mark ticket read', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/support/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.messages).toHaveLength(2); // 1 customer + 1 staff message

      const readRes = await request(app)
        .post(`/api/v1/support/tickets/${createdTicketId}/read`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(readRes.status).toBe(200);
      const ticket = await SupportTicket.findById(createdTicketId);
      expect(ticket?.customerUnreadCount).toBe(0);
    });

    it('should allow customer to reply back -> status transitions to WAITING_FOR_SUPPORT', async () => {
      const res = await request(app)
        .post(`/api/v1/support/tickets/${createdTicketId}/messages`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ message: 'Thank you for following up!' });

      expect(res.status).toBe(201);
      const ticket = await SupportTicket.findById(createdTicketId);
      expect(ticket?.status).toBe('WAITING_FOR_SUPPORT');
      expect(ticket?.staffUnreadCount).toBe(2);
    });

    it('should reject invalid status transition directly to OPEN from WAITING_FOR_SUPPORT', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/support/tickets/${createdTicketId}/status`)
        .set('Authorization', `Bearer ${supportStaffToken}`)
        .send({ status: 'OPEN' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_SUPPORT_INVALID_TRANSITION');
    });

    it('should require resolution summary when resolving ticket', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${createdTicketId}/resolve`)
        .set('Authorization', `Bearer ${supportStaffToken}`)
        .send({ resolutionSummary: 'ok' }); // < 5 characters

      expect(res.status).toBe(400);
    });

    it('should successfully resolve ticket with valid resolution summary', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${createdTicketId}/resolve`)
        .set('Authorization', `Bearer ${supportStaffToken}`)
        .send({ resolutionSummary: 'Tracking number updated and carrier confirmed delivery tomorrow morning.' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RESOLVED');

      const ticket = await SupportTicket.findById(createdTicketId);
      expect(ticket?.status).toBe('RESOLVED');
      expect(ticket?.resolvedAt).toBeDefined();
      expect(ticket?.resolutionSummary).toContain('delivery tomorrow');
    });
  });

  describe('6. Reopening & Closing Rules', () => {
    it('should allow customer to reopen ticket within 7-day window -> transitions to WAITING_FOR_SUPPORT', async () => {
      const res = await request(app)
        .post(`/api/v1/support/tickets/${createdTicketId}/reopen`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('WAITING_FOR_SUPPORT');

      const ticket = await SupportTicket.findById(createdTicketId);
      expect(ticket?.status).toBe('WAITING_FOR_SUPPORT');
      expect(ticket?.reopenedAt).toBeDefined();
    });

    it('should reject reopening if ticket resolved more than 7 days ago', async () => {
      // Manually set resolvedAt to 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      await SupportTicket.findByIdAndUpdate(createdTicketId, {
        status: 'RESOLVED',
        resolvedAt: eightDaysAgo,
      });

      const res = await request(app)
        .post(`/api/v1/support/tickets/${createdTicketId}/reopen`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_SUPPORT_REOPEN_WINDOW_EXPIRED');
    });

    it('should allow customer to close ticket', async () => {
      const res = await request(app)
        .post(`/api/v1/support/tickets/${createdTicketId}/close`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CLOSED');

      const ticket = await SupportTicket.findById(createdTicketId);
      expect(ticket?.status).toBe('CLOSED');
      expect(ticket?.closedAt).toBeDefined();
    });

    it('should reject new replies when ticket is CLOSED', async () => {
      const res = await request(app)
        .post(`/api/v1/support/tickets/${createdTicketId}/messages`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ message: 'Is anyone there?' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_SUPPORT_TICKET_CLOSED');
    });
  });
});
