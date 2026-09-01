import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

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
import { Counter } from '../src/modules/orders/counter.model.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/modules/orders/order.constants.js';
import { CHECKOUT_STATUS } from '../src/modules/checkout/checkout.constants.js';
import { TRANSACTION_TYPE, REFERENCE_TYPE } from '../src/modules/inventory/inventory.constants.js';

describe('Module 12: Order Management Integration Tests', () => {
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
  let testVariant1: any;
  let testVariant2: any;
  let testAddress: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
  });

  beforeEach(async () => {
    app = createApp();

    // 1. Clear database collections
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Brand.deleteMany({}),
      Product.deleteMany({}),
      ProductVariant.deleteMany({}),
      Inventory.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      Cart.deleteMany({}),
      Address.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Order.deleteMany({}),
      Counter.deleteMany({}),
    ]);


    // 2. Register and Login Customer User
    const custRes = await request(app).post('/api/v1/auth/register').send({
      email: 'shopper@test.local',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Shopper',
    });
    customerUser = await User.findById(custRes.body.data.user.id);
    await User.findByIdAndUpdate(customerUser._id, { isEmailVerified: true });
    const custLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'shopper@test.local',
      password: 'Password123!',
    });
    customerToken = custLogin.body.data.accessToken;

    // 3. Register and Login Other Customer User
    const otherRes = await request(app).post('/api/v1/auth/register').send({
      email: 'other@test.local',
      password: 'Password123!',
      firstName: 'Bob',
      lastName: 'Other',
    });
    otherCustomerUser = await User.findById(otherRes.body.data.user.id);
    await User.findByIdAndUpdate(otherCustomerUser._id, { isEmailVerified: true });
    const otherLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'other@test.local',
      password: 'Password123!',
    });
    otherCustomerToken = otherLogin.body.data.accessToken;

    // 4. Create and log in Super Admin
    const superRes = await request(app).post('/api/v1/auth/register').send({
      email: 'superadmin@test.local',
      password: 'Password123!',
      firstName: 'Super',
      lastName: 'Admin',
    });
    superAdminUser = await User.findById(superRes.body.data.user.id);
    await User.findByIdAndUpdate(superAdminUser._id, {
      isEmailVerified: true,
      role: ROLES.SUPER_ADMIN,
    });
    const superLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@test.local',
      password: 'Password123!',
    });
    superAdminToken = superLogin.body.data.accessToken;

    // 5. Create and log in Order Manager
    const orderMgrRes = await request(app).post('/api/v1/auth/register').send({
      email: 'ordermanager@test.local',
      password: 'Password123!',
      firstName: 'Order',
      lastName: 'Manager',
    });
    orderManagerUser = await User.findById(orderMgrRes.body.data.user.id);
    await User.findByIdAndUpdate(orderManagerUser._id, {
      isEmailVerified: true,
      role: ROLES.ORDER_MANAGER,
    });
    const orderMgrLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'ordermanager@test.local',
      password: 'Password123!',
    });
    orderManagerToken = orderMgrLogin.body.data.accessToken;

    // 6. Create and log in Product Manager
    const prodMgrRes = await request(app).post('/api/v1/auth/register').send({
      email: 'prodmgr@test.local',
      password: 'Password123!',
      firstName: 'Product',
      lastName: 'Manager',
    });
    productManagerUser = await User.findById(prodMgrRes.body.data.user.id);
    await User.findByIdAndUpdate(productManagerUser._id, {
      isEmailVerified: true,
      role: ROLES.PRODUCT_MANAGER,
    });
    const prodMgrLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'prodmgr@test.local',
      password: 'Password123!',
    });
    productManagerToken = prodMgrLogin.body.data.accessToken;


    // 7. Seed Active Category, Brand, Product, and Variants
    testCategory = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      isActive: true,
    });

    testBrand = await Brand.create({
      name: 'Acme Corp',
      normalizedName: 'acme corp',
      slug: 'acme-corp',
      isActive: true,
    });

    testProduct = await Product.create({
      name: 'Flagship Smartphone',
      slug: 'flagship-smartphone',
      categoryId: testCategory._id,
      brandId: testBrand._id,
      status: 'ACTIVE',
      images: [{ url: 'https://images.local/phone.png', altText: 'Phone', isPrimary: true }],
      featured: true,
    });

    testVariant1 = await ProductVariant.create({
      productId: testProduct._id,
      sku: 'PHONE-BLK-128',
      name: 'Black 128GB',
      price: 15000000, // 150,000 PKR in minor units
      costPrice: 12000000,
      isActive: true,
      status: 'ACTIVE',
      attributes: [{ name: 'Color', value: 'Black' }],
      attributeSignature: 'color:black',
    });

    testVariant2 = await ProductVariant.create({
      productId: testProduct._id,
      sku: 'PHONE-SLV-256',
      name: 'Silver 256GB',
      price: 18000000, // 180,000 PKR in minor units
      costPrice: 14000000,
      isActive: true,
      status: 'ACTIVE',
      attributes: [{ name: 'Color', value: 'Silver' }],
      attributeSignature: 'color:silver',
    });


    // 8. Seed physical warehouse inventory
    await Inventory.create({
      variantId: testVariant1._id,
      onHand: 20,
      reserved: 0,
      lowStockThreshold: 3,
    });

    await Inventory.create({
      variantId: testVariant2._id,
      onHand: 15,
      reserved: 0,
      lowStockThreshold: 3,
    });

    // 9. Create Customer Address
    testAddress = await Address.create({
      userId: customerUser._id,
      fullName: 'Jane Shopper',
      phone: '+923001234567',
      country: 'PK',
      stateProvince: 'Punjab',
      city: 'Lahore',
      addressLine1: 'House 123, Street 4, Gulberg III',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });
  });

  afterEach(async () => {
    // Clean up
  });

  // Helper to establish a valid active checkout session
  async function setupActiveCheckout(variantId = testVariant1._id, quantity = 2) {
    // 1. Add item to Cart
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        variantId: variantId.toString(),
        quantity,
      })
      .expect(200);

    // 2. Initiate Checkout
    const checkoutRes = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shippingAddressId: testAddress._id.toString(),
        billingSameAsShipping: true,
      })
      .expect(201);


    return checkoutRes.body.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ORDER CREATION & LIFECYCLE TESTS
  // ─────────────────────────────────────────────────────────────────────────
  describe('Order Creation & Idempotency Flow', () => {
    it('creates an Order from an active Checkout session and consumes inventory', async () => {
      await setupActiveCheckout(testVariant1._id, 2);

      // Verify stock state before order: onHand = 20, reserved = 2, available = 18
      const invBefore = await Inventory.findOne({ variantId: testVariant1._id });
      expect(invBefore!.onHand).toBe(20);
      expect(invBefore!.reserved).toBe(2);

      // Place Order
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customerNotes: 'Please ring the bell twice.',
        })
        .expect(201);

      const order = res.body.data.order;
      expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{6}$/);
      expect(order.status).toBe(ORDER_STATUS.PLACED);
      expect(order.paymentStatus).toBe(PAYMENT_STATUS.UNPAID);
      expect(order.subtotal).toBe(30000000); // 2 * 150,000 PKR
      expect(order.total).toBe(30000000);
      expect(order.currency).toBe('PKR');
      expect(order.customerNotes).toBe('Please ring the bell twice.');
      expect(order.items).toHaveLength(1);
      expect(order.items[0].sku).toBe('PHONE-BLK-128');
      expect(order.items[0].quantity).toBe(2);

      // Verify Final Inventory Consumption: onHand = 18, reserved = 0
      const invAfter = await Inventory.findOne({ variantId: testVariant1._id });
      expect(invAfter!.onHand).toBe(18);
      expect(invAfter!.reserved).toBe(0);

      // Verify SALE audit transaction
      const saleTx = await InventoryTransaction.findOne({
        variantId: testVariant1._id,
        type: TRANSACTION_TYPE.SALE,
      });
      expect(saleTx).not.toBeNull();
      expect(saleTx!.referenceType).toBe(REFERENCE_TYPE.ORDER);
      expect(saleTx!.quantity).toBe(2);
      expect(saleTx!.previousOnHand).toBe(20);
      expect(saleTx!.newOnHand).toBe(18);
      expect(saleTx!.previousReserved).toBe(2);
      expect(saleTx!.newReserved).toBe(0);

      // Verify Checkout is COMPLETED and inventoryReserved is false
      const sessionAfter = await CheckoutSession.findOne({ userId: customerUser._id });
      expect(sessionAfter!.status).toBe(CHECKOUT_STATUS.COMPLETED);
      expect(sessionAfter!.inventoryReserved).toBe(false);
      expect(sessionAfter!.completedAt).not.toBeNull();

      // Verify Cart is cleared
      const cartAfter = await Cart.findOne({ userId: customerUser._id });
      expect(cartAfter!.items).toHaveLength(0);
    });

    it('handles idempotent retries: repeated POST /orders returns existing order without duplicate stock consumption', async () => {
      await setupActiveCheckout(testVariant1._id, 1);

      // First call
      const res1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(201);

      const order1 = res1.body.data.order;

      // Second call for the same completed checkout
      const res2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect([200, 201]).toContain(res2.status);

      const order2 = res2.body.data.order;
      expect(order2.id).toBe(order1.id);
      expect(order2.orderNumber).toBe(order1.orderNumber);

      // Inventory should have been consumed only ONCE (onHand: 20 -> 19)
      const inv = await Inventory.findOne({ variantId: testVariant1._id });
      expect(inv!.onHand).toBe(19);
      expect(inv!.reserved).toBe(0);

      const saleTxCount = await InventoryTransaction.countDocuments({
        variantId: testVariant1._id,
        type: TRANSACTION_TYPE.SALE,
      });
      expect(saleTxCount).toBe(1);
    });

    it('rejects order creation if checkout session is expired or cancelled', async () => {
      const session = await setupActiveCheckout(testVariant1._id, 1);

      // Manually expire session
      await CheckoutSession.updateOne(
        { _id: session.id },
        { expiresAt: new Date(Date.now() - 1000) }
      );

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(410);

      expect(res.body.error.code).toBe('ERR_ORDER_CHECKOUT_EXPIRED');

      // Ensure no Order was created
      const orderCount = await Order.countDocuments({});
      expect(orderCount).toBe(0);

    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // IMMUTABLE SNAPSHOT & RESILIENCE TESTS
  // ─────────────────────────────────────────────────────────────────────────
  describe('Immutable Snapshot & Catalog Deletion Resilience', () => {
    it('retains original prices and names even if Product or Variant is updated or deleted later', async () => {
      await setupActiveCheckout(testVariant1._id, 1);

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(201);

      const orderId = orderRes.body.data.order.id;

      // Admin updates product name and variant price
      await Product.findByIdAndUpdate(testProduct._id, { name: 'Super Phone 2000' });
      await ProductVariant.findByIdAndUpdate(testVariant1._id, { price: 99999999 });

      // Customer fetches order details
      const detailRes = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const orderDetail = detailRes.body.data.order;
      expect(orderDetail.items[0].productName).toBe('Flagship Smartphone'); // Original snapshot preserved
      expect(orderDetail.items[0].unitPrice).toBe(15000000); // Original snapshot price preserved
      expect(orderDetail.subtotal).toBe(15000000);
      expect(orderDetail.total).toBe(15000000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOMER ORDER LIST & OWNERSHIP ISOLATION
  // ─────────────────────────────────────────────────────────────────────────
  describe('Customer Order Queries & Isolation', () => {
    it('isolates customer order list and prevents cross-user access (IDOR: 404)', async () => {
      await setupActiveCheckout(testVariant1._id, 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(201);

      const orderId = orderRes.body.data.order.id;

      // Customer 1 sees their order in list
      const listRes = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(listRes.body.data.orders).toHaveLength(1);
      expect(listRes.body.data.orders[0].id).toBe(orderId);

      // Customer 2 list is empty
      const otherListRes = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(200);

      expect(otherListRes.body.data.orders).toHaveLength(0);

      // Customer 2 cannot access Customer 1 order by ID (404)
      await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CANCELLATION & STOCK RESTORATION TESTS
  // ─────────────────────────────────────────────────────────────────────────
  describe('Order Cancellation & Stock Restoration', () => {
    it('allows customer to cancel a PLACED order and atomically restores physical inventory', async () => {
      await setupActiveCheckout(testVariant1._id, 3);

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(201);

      const orderId = orderRes.body.data.order.id;

      // Check stock right after placement: onHand = 17 (20 - 3)
      const invAfterPlace = await Inventory.findOne({ variantId: testVariant1._id });
      expect(invAfterPlace!.onHand).toBe(17);

      // Customer cancels order
      const cancelRes = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Changed mind, ordering silver instead.',
        })
        .expect(200);

      expect(cancelRes.body.data.order.status).toBe(ORDER_STATUS.CANCELLED);
      expect(cancelRes.body.data.order.canCancel).toBe(false);

      // Stock is restored: onHand = 20
      const invAfterCancel = await Inventory.findOne({ variantId: testVariant1._id });
      expect(invAfterCancel!.onHand).toBe(20);

      // ORDER_CANCELLATION transaction recorded
      const cancelTx = await InventoryTransaction.findOne({
        variantId: testVariant1._id,
        type: TRANSACTION_TYPE.ORDER_CANCELLATION,
      });
      expect(cancelTx).not.toBeNull();
      expect(cancelTx!.quantity).toBe(3);
      expect(cancelTx!.newOnHand).toBe(20);

      // Double cancellation is rejected and does not restore stock twice
      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Try cancel again' })
        .expect(400);

      const invAfterDouble = await Inventory.findOne({ variantId: testVariant1._id });
      expect(invAfterDouble!.onHand).toBe(20); // Still 20, not 23!
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN ORDER MANAGEMENT & RBAC
  // ─────────────────────────────────────────────────────────────────────────
  describe('Admin Order Management & RBAC', () => {
    it('enforces RBAC permissions: ORDER_MANAGER allowed, PRODUCT_MANAGER and CUSTOMER denied', async () => {
      await setupActiveCheckout(testVariant1._id, 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(201);

      const orderId = orderRes.body.data.order.id;

      // ORDER_MANAGER can list and view order
      const mgrList = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .expect(200);

      expect(mgrList.body.data.orders).toHaveLength(1);

      // PRODUCT_MANAGER is denied (403)
      await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .expect(403);

      // CUSTOMER is denied (403)
      await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      // ORDER_MANAGER updates status: PLACED -> CONFIRMED
      const updateRes = await request(app)
        .patch(`/api/v1/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          status: ORDER_STATUS.CONFIRMED,
          note: 'Payment intent verified by support',
        })
        .expect(200);

      expect(updateRes.body.data.order.status).toBe(ORDER_STATUS.CONFIRMED);
      expect(updateRes.body.data.order.statusHistory).toHaveLength(2);
    });

    it('enforces valid status transition path and rejects invalid transitions', async () => {
      await setupActiveCheckout(testVariant1._id, 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(201);

      const orderId = orderRes.body.data.order.id;

      // Reject illegal jump: PLACED -> DELIVERED (400)
      await request(app)
        .patch(`/api/v1/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: ORDER_STATUS.DELIVERED })
        .expect(400);

      // Progress correctly: PLACED -> CONFIRMED -> PROCESSING -> READY_TO_SHIP -> SHIPPED -> DELIVERED
      await request(app)
        .patch(`/api/v1/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: ORDER_STATUS.CONFIRMED })
        .expect(200);

      await request(app)
        .patch(`/api/v1/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: ORDER_STATUS.PROCESSING })
        .expect(200);

      await request(app)
        .patch(`/api/v1/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: ORDER_STATUS.READY_TO_SHIP })
        .expect(200);

      await request(app)
        .patch(`/api/v1/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: ORDER_STATUS.SHIPPED })
        .expect(200);

      const finalRes = await request(app)
        .patch(`/api/v1/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: ORDER_STATUS.DELIVERED })
        .expect(200);

      expect(finalRes.body.data.order.status).toBe(ORDER_STATUS.DELIVERED);
      expect(finalRes.body.data.order.fulfillmentStatus).toBe(FULFILLMENT_STATUS.DELIVERED);

      // Customer cannot cancel once SHIPPED/DELIVERED
      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Attempt cancel delivered' })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY ACCEPTANCE CRITERIA (ORDER-SEC-01 TO ORDER-SEC-10)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Security Acceptance Criteria (ORDER-SEC-01..10)', () => {
    it('ORDER-SEC-01: Rejects unauthenticated requests', async () => {
      await request(app).post('/api/v1/orders').send({}).expect(401);
      await request(app).get('/api/v1/orders').expect(401);
      await request(app).get('/api/v1/admin/orders').expect(401);
    });

    it('ORDER-SEC-02 & 03: Rejects body tampering of items, prices, totals, or userId', async () => {
      await setupActiveCheckout(testVariant1._id, 1);

      // Tampered payload with client price / status / userId
      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          subtotal: 100,
          total: 100,
          status: 'DELIVERED',
          userId: otherCustomerUser._id.toString(),
          items: [{ variantId: testVariant1._id.toString(), quantity: 1, unitPrice: 1 }],
        })
        .expect(400);
    });

    it('ORDER-SEC-04: Customer cannot access or cancel another customer order', async () => {
      await setupActiveCheckout(testVariant1._id, 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(201);

      const orderId = orderRes.body.data.order.id;

      // Customer 2 tries to cancel Customer 1 order
      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({ reason: 'Hacking cancel' })
        .expect(404);
    });

    it('ORDER-SEC-05 & 06: Prevents double order creation from single checkout session', async () => {
      await setupActiveCheckout(testVariant1._id, 1);

      const res1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect([200, 201]).toContain(res2.status);
      expect(res2.body.data.order.id).toBe(res1.body.data.order.id);
    });


    it('ORDER-SEC-08: Double cancellation cannot restore stock twice', async () => {
      await setupActiveCheckout(testVariant1._id, 2);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(201);

      const orderId = orderRes.body.data.order.id;

      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(200);

      // Second cancel call
      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(400);

      const inv = await Inventory.findOne({ variantId: testVariant1._id });
      expect(inv!.onHand).toBe(20);
    });

    it('ORDER-SEC-09 & 10: Server rejects invalid status and customer DTO hides costPrice and internalNotes', async () => {
      await setupActiveCheckout(testVariant1._id, 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(201);

      const orderId = orderRes.body.data.order.id;

      // Admin adds internal notes
      await request(app)
        .patch(`/api/v1/admin/orders/${orderId}/internal-note`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ internalNotes: 'High priority customer VIP account' })
        .expect(200);

      // Customer gets order details: internalNotes & costPrice are not present
      const custDetail = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(custDetail.body.data.order.internalNotes).toBeUndefined();
      expect(custDetail.body.data.order.items[0].costPrice).toBeUndefined();

      // Admin gets order details: internalNotes is present
      const adminDetail = await request(app)
        .get(`/api/v1/admin/orders/${orderId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(adminDetail.body.data.order.internalNotes).toBe('High priority customer VIP account');
    });
  });
});
