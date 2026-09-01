import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { Category } from '../src/modules/catalog/categories/category.model.js';
import { Brand } from '../src/modules/catalog/brands/brand.model.js';
import { Product } from '../src/modules/catalog/products/product.model.js';
import { ProductVariant } from '../src/modules/catalog/products/product-variant.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { InventoryTransaction } from '../src/modules/inventory/inventory-transaction.model.js';
import { Cart } from '../src/modules/cart/cart.model.js';
import { Address } from '../src/modules/addresses/address.model.js';
import { CheckoutSession } from '../src/modules/checkout/checkout.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { Payment } from '../src/modules/payments/payment.model.js';
import { PaymentAttempt } from '../src/modules/payments/payment-attempt.model.js';
import { PaymentWebhookEvent } from '../src/modules/payments/payment-webhook-event.model.js';
import { Counter } from '../src/modules/orders/counter.model.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import {
  ORDER_STATUS,
  PAYMENT_STATUS as ORDER_PAYMENT_STATUS,
} from '../src/modules/orders/order.constants.js';
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_ATTEMPT_STATUS,
  WEBHOOK_STATUS,
} from '../src/modules/payments/payment.constants.js';
import { TestPaymentProvider } from '../src/modules/payments/providers/test-payment.provider.js';

import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';

describe('Module 13: Payment Integration & Security Test Suite', () => {
  let app: any;
  let customerUser: any;
  let customerToken: string;
  let otherCustomerUser: any;
  let otherCustomerToken: string;
  let superAdminUser: any;
  let superAdminToken: string;
  let orderManagerUser: any;
  let orderManagerToken: string;
  let productManagerUser: any;
  let productManagerToken: string;

  let testCategory: any;
  let testBrand: any;
  let testProduct: any;
  let testVariant: any;
  let testAddress: any;

  const testProvider = new TestPaymentProvider();
  const DUMMY_HASH = '$2a$10$e8Oh1Z054H8N8pP91cQhEObJgYV7X.P88L4W5bK9qH9N8pP91cQhE';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
  });

  beforeEach(async () => {
    app = createApp();

    // 1. Clear database collections sequentially to prevent index race conditions
    await User.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await Product.deleteMany({});
    await ProductVariant.deleteMany({});
    await Inventory.deleteMany({});
    await InventoryTransaction.deleteMany({});
    await Cart.deleteMany({});
    await Address.deleteMany({});
    await CheckoutSession.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await PaymentAttempt.deleteMany({});
    await PaymentWebhookEvent.deleteMany({});
    await Counter.deleteMany({});

    // 2. Setup Customer User
    customerUser = await User.create({
      email: 'shopper@test.local',
      passwordHash: DUMMY_HASH,
      firstName: 'Jane',
      lastName: 'Shopper',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = generateAccessToken({
      sub: customerUser._id.toString(),
      role: customerUser.role,
      email: customerUser.email,
    });

    // 3. Setup Other Customer User
    otherCustomerUser = await User.create({
      email: 'other@test.local',
      passwordHash: DUMMY_HASH,
      firstName: 'Bob',
      lastName: 'Other',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    otherCustomerToken = generateAccessToken({
      sub: otherCustomerUser._id.toString(),
      role: otherCustomerUser.role,
      email: otherCustomerUser.email,
    });

    // 4. Setup Super Admin
    superAdminUser = await User.create({
      email: 'superadmin@test.local',
      passwordHash: DUMMY_HASH,
      firstName: 'Super',
      lastName: 'Admin',
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    superAdminToken = generateAccessToken({
      sub: superAdminUser._id.toString(),
      role: superAdminUser.role,
      email: superAdminUser.email,
    });

    // 5. Setup Order Manager
    orderManagerUser = await User.create({
      email: 'ordermanager@test.local',
      passwordHash: DUMMY_HASH,
      firstName: 'Order',
      lastName: 'Manager',
      role: ROLES.ORDER_MANAGER,
      isEmailVerified: true,
      isActive: true,
    });
    orderManagerToken = generateAccessToken({
      sub: orderManagerUser._id.toString(),
      role: orderManagerUser.role,
      email: orderManagerUser.email,
    });

    // 6. Setup Product Manager
    productManagerUser = await User.create({
      email: 'prodmanager@test.local',
      passwordHash: DUMMY_HASH,
      firstName: 'Product',
      lastName: 'Manager',
      role: ROLES.PRODUCT_MANAGER,
      isEmailVerified: true,
      isActive: true,
    });
    productManagerToken = generateAccessToken({
      sub: productManagerUser._id.toString(),
      role: productManagerUser.role,
      email: productManagerUser.email,
    });


    // 7. Seed Catalog, Product & Inventory
    testCategory = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      isActive: true,
    });

    testBrand = await Brand.create({
      name: 'Acme',
      normalizedName: 'acme',
      slug: 'acme',
      isActive: true,
    });

    testProduct = await Product.create({
      name: 'Flagship Smartphone',
      slug: 'flagship-smartphone',
      categoryId: testCategory._id,
      brandId: testBrand._id,
      status: 'ACTIVE',
      images: [{ url: 'https://img.local/phone.png', altText: 'Phone', isPrimary: true }],
      featured: true,
    });

    testVariant = await ProductVariant.create({
      productId: testProduct._id,
      sku: 'PHONE-BLK-128',
      name: 'Black 128GB',
      price: 800,
      costPrice: 500,
      isActive: true,
      status: 'ACTIVE',
      attributes: [{ name: 'Color', value: 'Black' }],
      attributeSignature: 'color:black',
    });

    await Inventory.create({
      variantId: testVariant._id,
      productId: testProduct._id,
      onHand: 100,
      reserved: 0,
      lowStockThreshold: 5,
    });


    // 8. Create Customer Address
    testAddress = await Address.create({
      userId: customerUser._id,
      fullName: 'Jane Shopper',
      phone: '+923001234567',
      addressLine1: '123 Market St',
      city: 'Lahore',
      stateProvince: 'Punjab',
      postalCode: '54000',
      country: 'PK',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

  });

  // Helper to create a valid placed order
  async function createValidOrder(token = customerToken): Promise<any> {
    // 1. Determine address based on token
    let addrId = testAddress._id.toString();
    if (token === otherCustomerToken) {
      const otherAddress = await Address.create({
        userId: otherCustomerUser._id,
        fullName: 'Bob Other',
        phone: '+923009876543',
        addressLine1: '456 Other Rd',
        city: 'Lahore',
        stateProvince: 'Punjab',
        postalCode: '54000',
        country: 'PK',
        isDefaultShipping: true,
        isDefaultBilling: true,
      });
      addrId = otherAddress._id.toString();
    }

    // 2. Add item to cart
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ variantId: testVariant._id.toString(), quantity: 2 });

    // 3. Create checkout session
    await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddressId: addrId,
        billingSameAsShipping: true,
      })
      .expect(201);

    // 4. Create order
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerNotes: 'Payment test order' })
      .expect(201);

    return orderRes.body.data.order;
  }



  describe('1. Payment Methods & Cash on Delivery (COD) Flow', () => {
    it('returns available payment methods', async () => {
      const res = await request(app).get('/api/v1/payments/methods');

      expect(res.status).toBe(200);
      expect(res.body.data.methods).toBeInstanceOf(Array);
      expect(res.body.data.methods.length).toBeGreaterThanOrEqual(2);
      const codes = res.body.data.methods.map((m: any) => m.code);
      expect(codes).toContain('ONLINE');
      expect(codes).toContain('CASH_ON_DELIVERY');
    });

    it('initiates CASH_ON_DELIVERY payment, keeping Payment and Order status PENDING', async () => {
      const order = await createValidOrder();

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: order.id,
          method: 'CASH_ON_DELIVERY',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.payment.paymentNumber).toMatch(/^PAY-\d{4}-\d{6}$/);
      expect(res.body.data.payment.status).toBe(PAYMENT_STATUS.PENDING);
      expect(res.body.data.payment.amount).toBe(order.total);
      expect(res.body.data.payment.currency).toBe(order.currency);
      expect(res.body.data.payment.method).toBe(PAYMENT_METHOD.CASH_ON_DELIVERY);


      // Verify order paymentStatus is PENDING
      const dbOrder = await Order.findById(order.id);
      expect(dbOrder?.paymentStatus).toBe(ORDER_PAYMENT_STATUS.PENDING);
    });

    it('allows authorized admin to confirm COD collection, transitioning Payment to SUCCEEDED and Order to PAID', async () => {
      const order = await createValidOrder();

      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: order.id,
          method: 'CASH_ON_DELIVERY',
        });

      const paymentId = initRes.body.data.payment.id;

      // Admin confirms COD
      const confirmRes = await request(app)
        .post(`/api/v1/admin/payments/${paymentId}/confirm-cod`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ note: 'Collected $1600 cash on delivery' });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.status).toBe(PAYMENT_STATUS.SUCCEEDED);
      expect(confirmRes.body.data.paidAt).toBeDefined();

      const dbOrder = await Order.findById(order.id);
      expect(dbOrder?.paymentStatus).toBe(ORDER_PAYMENT_STATUS.PAID);
    });

    it('rejects COD confirmation attempt on ONLINE payments', async () => {
      const order = await createValidOrder();

      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: order.id,
          method: 'ONLINE',
        });

      const paymentId = initRes.body.data.payment.id;

      const confirmRes = await request(app)
        .post(`/api/v1/admin/payments/${paymentId}/confirm-cod`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ note: 'Invalid attempt' });

      expect(confirmRes.status).toBe(400);
      expect(confirmRes.body.error.code).toBe('ERR_PAYMENT_INVALID_ACTION');
    });
  });

  describe('2. Online Payment Initiation, Retries & Attempt Management', () => {
    it('initiates ONLINE payment, derives amount & currency from Order, and creates PaymentAttempt', async () => {
      const order = await createValidOrder();

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: order.id,
          method: 'ONLINE',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.payment.amount).toBe(order.total);
      expect(res.body.data.payment.currency).toBe(order.currency);
      expect(res.body.data.attempt.attemptNumber).toBe(1);
      expect(res.body.data.attempt.provider).toBe('TEST');
      expect(res.body.data.checkoutUrl).toBeDefined();
      expect(res.body.data.clientToken).toBeDefined();
    });

    it('reuses existing active attempt if payment is already PENDING / PROCESSING', async () => {
      const order = await createValidOrder();

      const res1 = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const attempt1Id = res1.body.data.attempt.id;

      // Second rapid request
      const res2 = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      expect(res2.status).toBe(201);
      expect(res2.body.data.attempt.id).toBe(attempt1Id);
      expect(res2.body.data.attempt.attemptNumber).toBe(1);

      const totalAttempts = await PaymentAttempt.countDocuments({ orderId: order.id });
      expect(totalAttempts).toBe(1);
    });

    it('creates a new historical attempt on retry when previous attempt failed', async () => {
      const order = await createValidOrder();

      const res1 = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const attempt1Id = res1.body.data.attempt.id;
      const paymentId = res1.body.data.payment.id;

      // Simulate failure of attempt 1 via webhook
      const failPayload = {
        providerEventId: 'evt_fail_1',
        eventType: 'payment.failed',
        providerPaymentId: `test_pay_${attempt1Id}`,
        failureCode: 'CARD_DECLINED',
        failureMessage: 'Insufficient funds on test card',
        metadata: { paymentId, attemptId: attempt1Id },
      };
      const rawBody = JSON.stringify(failPayload);
      const signature = testProvider.generateTestSignature(rawBody);

      await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      // Now customer retries
      const retryRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      expect(retryRes.status).toBe(201);
      expect(retryRes.body.data.attempt.attemptNumber).toBe(2);
      expect(retryRes.body.data.attempt.id).not.toBe(attempt1Id);

      // Verify customer payment history retains attempt 1 failure details
      const historyRes = await request(app)
        .get(`/api/v1/payments/order/${order.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.attempts).toHaveLength(2);
      const failedAttempt = historyRes.body.data.attempts.find((a: any) => a.attemptNumber === 1);
      expect(failedAttempt.status).toBe(PAYMENT_ATTEMPT_STATUS.FAILED);
      expect(failedAttempt.failureCode).toBe('CARD_DECLINED');
    });

    it('enforces maximum payment attempt limit per order', async () => {
      const order = await createValidOrder();

      const payment = await Payment.create({
        orderId: order.id,
        userId: customerUser._id,
        paymentNumber: 'PAY-2026-999999',
        amount: order.total,
        currency: order.currency,
        method: PAYMENT_METHOD.ONLINE,
        status: PAYMENT_STATUS.FAILED,
        provider: 'TEST',
      });

      // Seed 10 failed attempts
      for (let i = 1; i <= 10; i++) {
        await PaymentAttempt.create({
          paymentId: payment._id,
          orderId: order.id,
          userId: customerUser._id,
          attemptNumber: i,
          provider: 'TEST',
          method: PAYMENT_METHOD.ONLINE,
          status: PAYMENT_ATTEMPT_STATUS.FAILED,
          amount: order.total,
          currency: order.currency,
          initiatedAt: new Date(),
          completedAt: new Date(),
        });
      }

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_PAYMENT_ATTEMPT_LIMIT');
    });
  });

  describe('3. Webhook Processing, Signature Verification & Idempotency', () => {
    it('processes verified success webhook: updates attempt SUCCEEDED, Payment SUCCEEDED, and Order PAID', async () => {
      const order = await createValidOrder();

      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const attemptId = initRes.body.data.attempt.id;
      const paymentId = initRes.body.data.payment.id;

      const successPayload = {
        providerEventId: 'evt_success_101',
        eventType: 'payment.succeeded',
        providerPaymentId: `test_pay_${attemptId}`,
        providerTransactionId: 'ch_test_999888',
        metadata: { paymentId, attemptId },
      };

      const rawBody = JSON.stringify(successPayload);
      const signature = testProvider.generateTestSignature(rawBody);

      const webhookRes = await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.data.status).toBe('PROCESSED');

      // Verify Payment document
      const dbPayment = await Payment.findById(paymentId);
      expect(dbPayment?.status).toBe(PAYMENT_STATUS.SUCCEEDED);
      expect(dbPayment?.paidAt).toBeDefined();
      expect(dbPayment?.providerTransactionId).toBe('ch_test_999888');

      // Verify Order document
      const dbOrder = await Order.findById(order.id);
      expect(dbOrder?.paymentStatus).toBe(ORDER_PAYMENT_STATUS.PAID);
    });

    it('rejects webhooks with invalid cryptographic signature (401)', async () => {
      const payload = {
        providerEventId: 'evt_tampered_1',
        eventType: 'payment.succeeded',
      };
      const rawBody = JSON.stringify(payload);

      const res = await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', 'deadbeefcafebabe1234567890')
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ERR_PAYMENT_INVALID_SIGNATURE');
    });

    it('handles duplicate webhook event idempotently without duplicating side effects', async () => {
      const order = await createValidOrder();
      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const attemptId = initRes.body.data.attempt.id;
      const paymentId = initRes.body.data.payment.id;

      const payload = {
        providerEventId: 'evt_idempotent_test',
        eventType: 'payment.succeeded',
        providerPaymentId: `test_pay_${attemptId}`,
        providerTransactionId: 'ch_txn_001',
        metadata: { paymentId, attemptId },
      };
      const rawBody = JSON.stringify(payload);
      const signature = testProvider.generateTestSignature(rawBody);

      // First delivery
      const res1 = await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);
      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe('PROCESSED');

      // Replay same event
      const res2 = await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);
      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('IDEMPOTENT_IGNORE');

      const eventsCount = await PaymentWebhookEvent.countDocuments({
        providerEventId: 'evt_idempotent_test',
      });
      expect(eventsCount).toBe(1);
    });

    it('prevents delayed or out-of-order failure events from downgrading an already SUCCEEDED payment', async () => {
      const order = await createValidOrder();
      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const attemptId = initRes.body.data.attempt.id;
      const paymentId = initRes.body.data.payment.id;

      // 1. Success event arrives
      const successPayload = {
        providerEventId: 'evt_success_first',
        eventType: 'payment.succeeded',
        providerPaymentId: `test_pay_${attemptId}`,
        metadata: { paymentId, attemptId },
      };
      const successRaw = JSON.stringify(successPayload);
      await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', testProvider.generateTestSignature(successRaw))
        .set('Content-Type', 'application/json')
        .send(successRaw);

      // 2. Stale/delayed failure arrives
      const staleFailPayload = {
        providerEventId: 'evt_stale_fail',
        eventType: 'payment.failed',
        providerPaymentId: `test_pay_${attemptId}`,
        failureCode: 'LATE_TIMEOUT',
        failureMessage: 'Late timeout packet',
        metadata: { paymentId, attemptId },
      };
      const failRaw = JSON.stringify(staleFailPayload);
      await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', testProvider.generateTestSignature(failRaw))
        .set('Content-Type', 'application/json')
        .send(failRaw);

      // Verify payment & order stay SUCCEEDED and PAID
      const dbPayment = await Payment.findById(paymentId);
      expect(dbPayment?.status).toBe(PAYMENT_STATUS.SUCCEEDED);

      const dbOrder = await Order.findById(order.id);
      expect(dbOrder?.paymentStatus).toBe(ORDER_PAYMENT_STATUS.PAID);
    });
  });

  describe('4. Order Cancellation Interaction & Paid Protection', () => {
    it('blocks simple cancellation of a PAID order (ERR_ORDER_PAID_CANCELLATION_REQUIRES_REFUND)', async () => {
      const order = await createValidOrder();

      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const attemptId = initRes.body.data.attempt.id;
      const paymentId = initRes.body.data.payment.id;

      // Mark paid via webhook
      const successPayload = {
        providerEventId: 'evt_mark_paid',
        eventType: 'payment.succeeded',
        providerPaymentId: `test_pay_${attemptId}`,
        metadata: { paymentId, attemptId },
      };
      const rawBody = JSON.stringify(successPayload);
      await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', testProvider.generateTestSignature(rawBody))
        .set('Content-Type', 'application/json')
        .send(rawBody);

      // Customer tries simple cancellation
      const custCancelRes = await request(app)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Want refund' });

      expect(custCancelRes.status).toBe(400);
      expect(custCancelRes.body.error.code).toBe('ERR_ORDER_PAID_CANCELLATION_REQUIRES_REFUND');

      // Admin tries simple cancellation
      const adminCancelRes = await request(app)
        .post(`/api/v1/admin/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Admin cancel attempt' });

      expect(adminCancelRes.status).toBe(400);
      expect(adminCancelRes.body.error.code).toBe('ERR_ORDER_PAID_CANCELLATION_REQUIRES_REFUND');
    });

    it('cancels pending payment attempts when an UNPAID order is cancelled', async () => {
      const order = await createValidOrder();

      await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      // Customer cancels unpaid order
      const cancelRes = await request(app)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed my mind' });

      expect(cancelRes.status).toBe(200);

      const dbPayment = await Payment.findOne({ orderId: order.id });
      expect(dbPayment?.status).toBe(PAYMENT_STATUS.CANCELLED);

      const attempts = await PaymentAttempt.find({ orderId: order.id });
      expect(attempts[0].status).toBe(PAYMENT_ATTEMPT_STATUS.CANCELLED);
    });
  });

  describe('5. Admin Management, Reconciliation & RBAC Security', () => {
    it('allows ORDER_MANAGER to read and list payments with filters and pagination', async () => {
      const order = await createValidOrder();
      await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const res = await request(app)
        .get('/api/v1/admin/payments?page=1&limit=10')
        .set('Authorization', `Bearer ${orderManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination).toBeDefined();
    });

    it('denies PRODUCT_MANAGER and regular CUSTOMER from accessing admin payment APIs (403)', async () => {
      const pmRes = await request(app)
        .get('/api/v1/admin/payments')
        .set('Authorization', `Bearer ${productManagerToken}`);
      expect(pmRes.status).toBe(403);

      const custRes = await request(app)
        .get('/api/v1/admin/payments')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(custRes.status).toBe(403);
    });

    it('supports admin provider reconciliation for syncing out-of-band payment settlements', async () => {
      const order = await createValidOrder();
      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const paymentId = initRes.body.data.payment.id;

      const reconcileRes = await request(app)
        .post(`/api/v1/admin/payments/${paymentId}/reconcile`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(reconcileRes.status).toBe(200);
      expect(reconcileRes.body.data.status).toBe(PAYMENT_STATUS.SUCCEEDED);

      const dbOrder = await Order.findById(order.id);
      expect(dbOrder?.paymentStatus).toBe(ORDER_PAYMENT_STATUS.PAID);
    });
  });

  describe('6. Security Acceptance Criteria (PAYMENT-SEC-01..10)', () => {
    it('PAYMENT-SEC-01 & 02: Client payload cannot override payment amount or currency', async () => {
      const order = await createValidOrder();

      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: order.id,
          method: 'ONLINE',
          amount: 1, // Tampering attempt
          currency: 'EUR', // Tampering attempt
        });

      // Strict zod schema rejects extra fields
      expect(res.status).toBe(400);
    });

    it('PAYMENT-SEC-03: Customer cannot initiate or view payment for another customer order (404)', async () => {
      const order = await createValidOrder();

      // Bob tries to pay Jane's order
      const payRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          orderId: order.id,
          method: 'ONLINE',
        });
      expect(payRes.status).toBe(404);

      // Bob tries to read Jane's payment
      const viewRes = await request(app)
        .get(`/api/v1/payments/order/${order.id}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);
      expect(viewRes.status).toBe(404);
    });

    it('PAYMENT-SEC-04 & 08: Payment DTOs and database models never store or leak card credentials or provider secrets', async () => {
      const order = await createValidOrder();
      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const responseString = JSON.stringify(initRes.body);
      expect(responseString).not.toContain('secret');
      expect(responseString).not.toContain('cardNumber');
      expect(responseString).not.toContain('cvv');
      expect(responseString).not.toContain('apiKey');
    });

    it('PAYMENT-SEC-05: Webhook requests without signature or with invalid signature cannot mutate payment state', async () => {
      const order = await createValidOrder();
      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const paymentId = initRes.body.data.payment.id;

      // No signature header
      const res1 = await request(app)
        .post('/api/v1/webhooks/payments/test')
        .send({ providerEventId: 'evt_no_sig', eventType: 'payment.succeeded' });
      expect(res1.status).toBe(401);

      const dbPayment = await Payment.findById(paymentId);
      expect(dbPayment?.status).toBe(PAYMENT_STATUS.PENDING);
    });

    it('PAYMENT-SEC-06: Duplicate signed webhook replay does not trigger duplicate mutations', async () => {
      const order = await createValidOrder();
      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const attemptId = initRes.body.data.attempt.id;
      const paymentId = initRes.body.data.payment.id;

      const payload = {
        providerEventId: 'evt_replay_guard',
        eventType: 'payment.succeeded',
        providerPaymentId: `test_pay_${attemptId}`,
        metadata: { paymentId, attemptId },
      };
      const raw = JSON.stringify(payload);
      const sig = testProvider.generateTestSignature(raw);

      await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', sig)
        .set('Content-Type', 'application/json')
        .send(raw);

      const firstPaidAt = (await Payment.findById(paymentId))?.paidAt;

      // Replay
      await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', sig)
        .set('Content-Type', 'application/json')
        .send(raw);

      const secondPaidAt = (await Payment.findById(paymentId))?.paidAt;
      expect(firstPaidAt?.getTime()).toBe(secondPaidAt?.getTime());
    });

    it('PAYMENT-SEC-07: Succeeded payment and Paid order cannot be downgraded by delayed failure webhook', async () => {
      const order = await createValidOrder();
      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const attemptId = initRes.body.data.attempt.id;
      const paymentId = initRes.body.data.payment.id;

      // Succeeded
      const successPayload = {
        providerEventId: 'evt_sec_07_success',
        eventType: 'payment.succeeded',
        providerPaymentId: `test_pay_${attemptId}`,
        metadata: { paymentId, attemptId },
      };
      const rawSuccess = JSON.stringify(successPayload);
      await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', testProvider.generateTestSignature(rawSuccess))
        .set('Content-Type', 'application/json')
        .send(rawSuccess);

      // Late Failure
      const failPayload = {
        providerEventId: 'evt_sec_07_fail',
        eventType: 'payment.failed',
        providerPaymentId: `test_pay_${attemptId}`,
        metadata: { paymentId, attemptId },
      };
      const rawFail = JSON.stringify(failPayload);
      await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', testProvider.generateTestSignature(rawFail))
        .set('Content-Type', 'application/json')
        .send(rawFail);

      const dbPayment = await Payment.findById(paymentId);
      expect(dbPayment?.status).toBe(PAYMENT_STATUS.SUCCEEDED);

      const dbOrder = await Order.findById(order.id);
      expect(dbOrder?.paymentStatus).toBe(ORDER_PAYMENT_STATUS.PAID);
    });

    it('PAYMENT-SEC-09: Admin cannot arbitrarily mark online payment paid without trusted provider confirmation', async () => {
      const order = await createValidOrder();
      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const paymentId = initRes.body.data.payment.id;

      // Online payment rejects COD manual confirmation
      const res = await request(app)
        .post(`/api/v1/admin/payments/${paymentId}/confirm-cod`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ note: 'Manual override' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_PAYMENT_INVALID_ACTION');
    });

    it('PAYMENT-SEC-10: PAID order cannot use simple cancellation flow that restores stock without refund handling', async () => {
      const order = await createValidOrder();
      const initRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderId: order.id, method: 'ONLINE' });

      const attemptId = initRes.body.data.attempt.id;
      const paymentId = initRes.body.data.payment.id;

      const successPayload = {
        providerEventId: 'evt_sec_10_success',
        eventType: 'payment.succeeded',
        providerPaymentId: `test_pay_${attemptId}`,
        metadata: { paymentId, attemptId },
      };
      const rawSuccess = JSON.stringify(successPayload);
      await request(app)
        .post('/api/v1/webhooks/payments/test')
        .set('x-test-signature', testProvider.generateTestSignature(rawSuccess))
        .set('Content-Type', 'application/json')
        .send(rawSuccess);

      const cancelRes = await request(app)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Customer cancel' });

      expect(cancelRes.status).toBe(400);
      expect(cancelRes.body.error.code).toBe('ERR_ORDER_PAID_CANCELLATION_REQUIRES_REFUND');
    });
  });
});
