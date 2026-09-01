import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
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
import { Payment } from '../src/modules/payments/payment.model.js';
import { ShippingMethod } from '../src/modules/shipping/shipping-method.model.js';
import { Shipment } from '../src/modules/shipping/shipment.model.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/modules/orders/order.constants.js';
import { PAYMENT_METHOD, PAYMENT_PROVIDER } from '../src/modules/payments/payment.constants.js';
import {
  SHIPMENT_STATUS,
  SHIPPING_METHOD_TYPE,
  CARRIER_TYPE,
} from '../src/modules/shipping/shipping.constants.js';
import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';
import { ErrorCodes } from '../src/shared/errors/error-codes.js';

describe('Module 14: Shipping & Fulfillment Integration Tests', () => {
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
  let customerSupportUser: any;
  let customerSupportToken: string;

  let testCategory: any;
  let testBrand: any;
  let testProduct: any;
  let testVariant1: any;
  let testVariant2: any;
  let testAddress: any;
  let otherAddress: any;

  let standardMethod: any;
  let expressMethod: any;
  let freeTierMethod: any;

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
      Payment.deleteMany({}),
      ShippingMethod.deleteMany({}),
      Shipment.deleteMany({}),
    ]);

    // 2. Fast User Fixture Creation
    customerUser = await User.create({
      email: 'customer@test.local',
      passwordHash: '$2b$10$epXtG7m71XJ5X1sUu5BvI.r1K08hXlK9c8Wq.L8j8m7q9t6v4m0s.',
      firstName: 'Alice',
      lastName: 'Smith',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
    });
    customerToken = generateAccessToken({
      sub: customerUser._id.toString(),
      role: customerUser.role,
      email: customerUser.email,
    });

    otherCustomerUser = await User.create({
      email: 'other@test.local',
      passwordHash: '$2b$10$epXtG7m71XJ5X1sUu5BvI.r1K08hXlK9c8Wq.L8j8m7q9t6v4m0s.',
      firstName: 'Bob',
      lastName: 'Jones',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
    });
    otherCustomerToken = generateAccessToken({
      sub: otherCustomerUser._id.toString(),
      role: otherCustomerUser.role,
      email: otherCustomerUser.email,
    });

    superAdminUser = await User.create({
      email: 'superadmin@test.local',
      passwordHash: '$2b$10$epXtG7m71XJ5X1sUu5BvI.r1K08hXlK9c8Wq.L8j8m7q9t6v4m0s.',
      firstName: 'Super',
      lastName: 'Admin',
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
    });
    superAdminToken = generateAccessToken({
      sub: superAdminUser._id.toString(),
      role: superAdminUser.role,
      email: superAdminUser.email,
    });

    orderManagerUser = await User.create({
      email: 'ordermanager@test.local',
      passwordHash: '$2b$10$epXtG7m71XJ5X1sUu5BvI.r1K08hXlK9c8Wq.L8j8m7q9t6v4m0s.',
      firstName: 'Order',
      lastName: 'Manager',
      role: ROLES.ORDER_MANAGER,
      isEmailVerified: true,
    });
    orderManagerToken = generateAccessToken({
      sub: orderManagerUser._id.toString(),
      role: orderManagerUser.role,
      email: orderManagerUser.email,
    });

    customerSupportUser = await User.create({
      email: 'customersupport@test.local',
      passwordHash: '$2b$10$epXtG7m71XJ5X1sUu5BvI.r1K08hXlK9c8Wq.L8j8m7q9t6v4m0s.',
      firstName: 'Support',
      lastName: 'Agent',
      role: ROLES.CUSTOMER_SUPPORT,
      isEmailVerified: true,
    });
    customerSupportToken = generateAccessToken({
      sub: customerSupportUser._id.toString(),
      role: customerSupportUser.role,
      email: customerSupportUser.email,
    });

    productManagerUser = await User.create({
      email: 'productmanager@test.local',
      passwordHash: '$2b$10$epXtG7m71XJ5X1sUu5BvI.r1K08hXlK9c8Wq.L8j8m7q9t6v4m0s.',
      firstName: 'Product',
      lastName: 'Manager',
      role: ROLES.PRODUCT_MANAGER,
      isEmailVerified: true,
    });
    productManagerToken = generateAccessToken({
      sub: productManagerUser._id.toString(),
      role: productManagerUser.role,
      email: productManagerUser.email,
    });

    // 3. Seed Catalog & Inventory
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
      name: 'Smartphone Pro',
      slug: 'smartphone-pro',
      description: 'High-end smartphone',
      categoryId: testCategory._id,
      brandId: testBrand._id,
      status: 'ACTIVE',
      images: [{ url: 'https://images.local/phone.png', altText: 'Phone', isPrimary: true }],
    });

    testVariant1 = await ProductVariant.create({
      productId: testProduct._id,
      sku: 'PHONE-BLK-128',
      name: 'Black 128GB',
      price: 500000, // 5,000 PKR in minor units
      costPrice: 400000,
      isActive: true,
      status: 'ACTIVE',
      attributes: [{ name: 'Color', value: 'Black' }],
      attributeSignature: 'color:black',
    });

    testVariant2 = await ProductVariant.create({
      productId: testProduct._id,
      sku: 'PHONE-WHT-256',
      name: 'White 256GB',
      price: 800000, // 8,000 PKR in minor units
      costPrice: 650000,
      isActive: true,
      status: 'ACTIVE',
      attributes: [{ name: 'Color', value: 'White' }],
      attributeSignature: 'color:white',
    });

    await Inventory.create({
      variantId: testVariant1._id,
      onHand: 50,
      reserved: 0,
      lowStockThreshold: 3,
    });

    await Inventory.create({
      variantId: testVariant2._id,
      onHand: 30,
      reserved: 0,
      lowStockThreshold: 3,
    });

    // 4. Create Addresses
    testAddress = await Address.create({
      userId: customerUser._id,
      fullName: 'Alice Smith',
      phone: '+923001234567',
      country: 'Pakistan',
      stateProvince: 'Sindh',
      city: 'Karachi',
      addressLine1: 'House 123, Street 4, Clifton',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    otherAddress = await Address.create({
      userId: otherCustomerUser._id,
      fullName: 'Bob Jones',
      phone: '+923007654321',
      country: 'Pakistan',
      stateProvince: 'Punjab',
      city: 'Lahore',
      addressLine1: 'House 456, Gulberg',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    // 5. Seed Default Shipping Methods
    standardMethod = await ShippingMethod.create({
      code: 'STD-DELIVERY',
      name: 'Standard Delivery',
      description: 'Standard overland delivery across Pakistan',
      type: SHIPPING_METHOD_TYPE.FLAT_RATE,
      baseFee: 25000, // 250 PKR
      freeAboveSubtotal: 1000000, // Free above 10,000 PKR (1000000 minor units)
      currency: 'PKR',
      estimatedMinDays: 3,
      estimatedMaxDays: 5,
      active: true,
      displayOrder: 1,
    });

    expressMethod = await ShippingMethod.create({
      code: 'EXP-EXPRESS',
      name: 'Express Courier',
      description: 'Next-day fast courier service',
      type: SHIPPING_METHOD_TYPE.FLAT_RATE,
      baseFee: 50000, // 500 PKR
      currency: 'PKR',
      estimatedMinDays: 1,
      estimatedMaxDays: 2,
      active: true,
      displayOrder: 2,
    });

    freeTierMethod = await ShippingMethod.create({
      code: 'FREE-SUPER',
      name: 'Free VIP Shipping',
      description: 'Free shipping for orders above 3,000 PKR',
      type: SHIPPING_METHOD_TYPE.FREE_TIERED,
      baseFee: 0,
      freeAboveSubtotal: 300000, // 3,000 PKR
      currency: 'PKR',
      estimatedMinDays: 4,
      estimatedMaxDays: 7,
      active: true,
      displayOrder: 3,
    });
  });

  // Helper function to create an active checkout session with cart items
  async function setupCheckoutWithItems(variantId: string, quantity: number, userToken = customerToken) {
    // Add item to cart
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ variantId, quantity });

    // Create checkout session
    const res = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        shippingAddressId: testAddress._id.toString(),
        billingSameAsShipping: true,
        shippingMethodId: standardMethod._id.toString(),
      });

    return res.body.data;
  }

  // --- 1. Admin Shipping Methods CRUD & Validation ---
  describe('Admin Shipping Methods CRUD & Validations', () => {
    it('allows super admin to create, read, update, and deactivate shipping methods', async () => {
      // Create new method
      const createRes = await request(app)
        .post('/api/v1/admin/shipping-methods')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'OVERNIGHT-AIR',
          name: 'Overnight Air Cargo',
          description: 'Same-day flight cargo',
          type: 'FLAT_RATE',
          baseFee: 120000, // 1200 PKR
          currency: 'PKR',
          estimatedMinDays: 1,
          estimatedMaxDays: 1,
          active: true,
          displayOrder: 4,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.code).toBe('OVERNIGHT-AIR');
      expect(createRes.body.data.baseFee).toBe(120000);

      const methodId = createRes.body.data.id;

      // Read single method
      const getRes = await request(app)
        .get(`/api/v1/admin/shipping-methods/${methodId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.name).toBe('Overnight Air Cargo');

      // Update method
      const updateRes = await request(app)
        .put(`/api/v1/admin/shipping-methods/${methodId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Overnight Air Priority',
          baseFee: 150000,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Overnight Air Priority');
      expect(updateRes.body.data.baseFee).toBe(150000);

      // Deactivate method
      const deleteRes = await request(app)
        .delete(`/api/v1/admin/shipping-methods/${methodId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.active).toBe(false);
    });

    it('rejects duplicate shipping method code (SHIPPING-SEC-08)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/shipping-methods')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'STD-DELIVERY', // already exists
          name: 'Duplicate Method',
          baseFee: 20000,
          currency: 'PKR',
          estimatedMinDays: 2,
          estimatedMaxDays: 4,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_SHIPPING_METHOD_CODE_EXISTS);
    });

    it('rejects negative fees and invalid day estimates (estimatedMinDays > estimatedMaxDays)', async () => {
      const negFeeRes = await request(app)
        .post('/api/v1/admin/shipping-methods')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'INVALID-FEE',
          name: 'Invalid Fee',
          baseFee: -500,
          currency: 'PKR',
          estimatedMinDays: 2,
          estimatedMaxDays: 4,
        });

      expect(negFeeRes.status).toBe(400);

      const invalidDaysRes = await request(app)
        .post('/api/v1/admin/shipping-methods')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'INVALID-DAYS',
          name: 'Invalid Days',
          baseFee: 25000,
          currency: 'PKR',
          estimatedMinDays: 7,
          estimatedMaxDays: 3, // min > max
        });

      expect(invalidDaysRes.status).toBe(400);
    });
  });

  // --- 2. Customer Shipping Quotes & Calculations ---
  describe('Customer Shipping Quotes & Authoritative Calculations', () => {
    it('returns eligible shipping methods and calculates authoritative quote fees for active cart', async () => {
      // Alice adds 1 phone (price: 500,000)
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId: testVariant1._id.toString(), quantity: 1 });

      const quoteRes = await request(app)
        .post('/api/v1/shipping/quote')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: testAddress._id.toString(),
        });

      expect(quoteRes.status).toBe(200);
      expect(quoteRes.body.success).toBe(true);
      expect(quoteRes.body.data.subtotal).toBe(500000);

      const methods = quoteRes.body.data.methods || quoteRes.body.data.eligibleMethods;
      expect(methods.length).toBeGreaterThanOrEqual(3);

      // STD-DELIVERY fee should be 25000 (subtotal 500k is < 1000k free threshold)
      const std = methods.find((m: any) => m.code === 'STD-DELIVERY');
      expect(std).toBeDefined();
      expect(std.fee).toBe(25000);

      // EXP-EXPRESS fee should be 50000
      const exp = methods.find((m: any) => m.code === 'EXP-EXPRESS');
      expect(exp).toBeDefined();
      expect(exp.fee).toBe(50000);

      // FREE-SUPER fee should be 0 because subtotal 500k is >= 300k threshold
      const free = methods.find((m: any) => m.code === 'FREE-SUPER');
      expect(free).toBeDefined();
      expect(free.fee).toBe(0);
    });

    it('calculates 0 fee when cart subtotal qualifies for free shipping threshold on standard method', async () => {
      // Alice adds 2 white phones (price: 800,000 * 2 = 1,600,000 > 1,000,000 free threshold)
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId: testVariant2._id.toString(), quantity: 2 });

      const quoteRes = await request(app)
        .post('/api/v1/shipping/quote')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: testAddress._id.toString(),
        });

      expect(quoteRes.status).toBe(200);
      const methods = quoteRes.body.data.methods || quoteRes.body.data.eligibleMethods;
      const std = methods.find((m: any) => m.code === 'STD-DELIVERY');
      expect(std.fee).toBe(0); // FREE above 10,000 PKR
    });

    it('prevents IDOR: requesting a quote for another customer address is rejected (SHIPPING-SEC-05)', async () => {
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId: testVariant1._id.toString(), quantity: 1 });

      // Alice tries to use Bob's address
      const res = await request(app)
        .post('/api/v1/shipping/quote')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: otherAddress._id.toString(),
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_ADDRESS_NOT_FOUND);
    });

    it('filters out inactive shipping methods from quotes', async () => {
      // Deactivate express method
      await ShippingMethod.findByIdAndUpdate(expressMethod._id, { active: false });

      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId: testVariant1._id.toString(), quantity: 1 });

      const quoteRes = await request(app)
        .post('/api/v1/shipping/quote')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: testAddress._id.toString(),
        });

      expect(quoteRes.status).toBe(200);
      const methods = quoteRes.body.data.methods || quoteRes.body.data.eligibleMethods;
      const exp = methods.find((m: any) => m.code === 'EXP-EXPRESS');
      expect(exp).toBeUndefined();
    });
  });

  // --- 3. Checkout & Order Integration with Server-Authoritative Fees ---
  describe('Checkout & Order Integration with Server-Authoritative Fees', () => {
    it('calculates total as subtotal + shippingFee in checkout and ignores/rejects client fee tampering (SHIPPING-SEC-02)', async () => {
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId: testVariant1._id.toString(), quantity: 1 });

      const sessionRes = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: testAddress._id.toString(),
          billingSameAsShipping: true,
          shippingMethodId: standardMethod._id.toString(),
        });

      expect(sessionRes.status).toBe(201);
      const session = sessionRes.body.data;
      expect(session.subtotal).toBe(500000);
      expect(session.shippingFee).toBe(25000); // Server calculated authoritatively
      expect(session.total).toBe(525000); // subtotal + shippingFee

      // Client fee tampering attempt is rejected
      const tamperRes = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: testAddress._id.toString(),
          billingSameAsShipping: true,
          shippingMethodId: standardMethod._id.toString(),
          shippingFee: 0, // Tampering attempt
        });

      expect(tamperRes.status).toBe(400);
    });

    it('preserves immutable shipping snapshot and fee in Order even if shipping method is later edited', async () => {
      await setupCheckoutWithItems(testVariant1._id.toString(), 1);

      // Create Order
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ customerNotes: 'Please ring the bell' });

      expect(orderRes.status).toBe(201);
      const order = orderRes.body.data.order;
      expect(order.subtotal).toBe(500000);
      expect(order.shippingFee).toBe(25000);
      expect(order.total).toBe(525000);
      expect(order.shippingMethod.code).toBe('STD-DELIVERY');
      expect(order.shippingMethod.fee).toBe(25000);

      // Admin updates standardMethod fee to 40,000 PKR
      await ShippingMethod.findByIdAndUpdate(standardMethod._id, { baseFee: 40000 });

      // Check that existing order is untouched
      const fetchedOrderRes = await request(app)
        .get(`/api/v1/orders/${order.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(fetchedOrderRes.status).toBe(200);
      expect(fetchedOrderRes.body.data.order.shippingFee).toBe(25000);
      expect(fetchedOrderRes.body.data.order.total).toBe(525000);
    });

    it('initializes Payment amount matching Order.total including shipping fee (Module 13 parity)', async () => {
      await setupCheckoutWithItems(testVariant1._id.toString(), 1);

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      const order = orderRes.body.data.order;

      // Initiate payment
      const paymentRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: order.id,
          method: 'ONLINE',
        });

      expect(paymentRes.status).toBe(201);
      expect(paymentRes.body.data.payment.amount).toBe(525000); // 500k subtotal + 25k shipping
      expect(paymentRes.body.data.payment.orderId).toBe(order.id);
    });
  });

  // --- 4. Shipment Creation, Fulfillment State Transitions & Tracking ---
  describe('Shipment Creation, Fulfillment State Transitions & Tracking', () => {
    let testOrder: any;

    beforeEach(async () => {
      await setupCheckoutWithItems(testVariant1._id.toString(), 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});
      testOrder = orderRes.body.data.order;
    });

    it('creates shipment with atomic SHP-YYYY-NNNNNN number and prevents duplicate shipment for same order (SHIPPING-SEC-01)', async () => {
      const createRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          carrier: CARRIER_TYPE.MANUAL,
          carrierName: 'TCS Courier Express',
          trackingNumber: 'TCS-987654321',
          trackingUrl: 'https://tcsexpress.com/track/TCS-987654321',
          internalNotes: 'Handle with care fragile electronics',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      const shipment = createRes.body.data;
      expect(shipment.shipmentNumber).toMatch(/^SHP-\d{4}-\d{6}$/);
      expect(shipment.status).toBe(SHIPMENT_STATUS.PENDING);
      expect(shipment.orderId).toBe(testOrder.id);
      expect(shipment.carrierName).toBe('TCS Courier Express');
      expect(shipment.internalNotes).toBe('Handle with care fragile electronics');

      // Attempt duplicate shipment creation for the same order
      const dupRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          carrier: CARRIER_TYPE.MANUAL,
          carrierName: 'Leopards Courier',
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe(ErrorCodes.ERR_SHIPMENT_ALREADY_EXISTS);
    });

    it('rejects XSS and invalid tracking URLs like javascript: or data: (SHIPPING-SEC-09)', async () => {
      const xssRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          carrier: CARRIER_TYPE.MANUAL,
          carrierName: 'TCS',
          trackingUrl: 'javascript:alert(1)',
        });

      expect(xssRes.status).toBe(400);

      const dataRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          carrier: CARRIER_TYPE.MANUAL,
          carrierName: 'TCS',
          trackingUrl: 'data:text/html,<script>alert(1)</script>',
        });

      expect(dataRes.status).toBe(400);
    });

    it('enforces payment rules: ONLINE unpaid order CANNOT be transitioned to SHIPPED (SHIPPING-SEC-06)', async () => {
      // 1. Create shipment
      const createRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ carrier: CARRIER_TYPE.MANUAL });

      const shipmentId = createRes.body.data.id;

      // 2. Transition to READY_TO_SHIP
      await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.READY_TO_SHIP });

      // 3. Attempt transition to SHIPPED while ONLINE order payment is UNPAID
      const shipRes = await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          status: SHIPMENT_STATUS.SHIPPED,
          trackingNumber: 'TRK-123456',
        });

      expect(shipRes.status).toBe(400);
      expect(shipRes.body.error.code).toBe(ErrorCodes.ERR_SHIPMENT_ORDER_PAYMENT_REQUIRED);

      // Now simulate payment success
      await Order.findByIdAndUpdate(testOrder.id, { paymentStatus: PAYMENT_STATUS.PAID });

      // Retrying transition to SHIPPED now succeeds
      const shipSuccessRes = await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          status: SHIPMENT_STATUS.SHIPPED,
          trackingNumber: 'TRK-123456',
        });

      expect(shipSuccessRes.status).toBe(200);
      expect(shipSuccessRes.body.data.status).toBe(SHIPMENT_STATUS.SHIPPED);
      expect(shipSuccessRes.body.data.shippedAt).toBeDefined();

      // Check Order fulfillmentStatus synchronized to SHIPPED
      const updatedOrder = await Order.findById(testOrder.id);
      expect(updatedOrder?.fulfillmentStatus).toBe(FULFILLMENT_STATUS.SHIPPED);
      expect(updatedOrder?.status).toBe(ORDER_STATUS.SHIPPED);
    });

    it('permits Cash On Delivery (COD) orders to be marked SHIPPED while payment is PENDING (SHIPPING-SEC-07)', async () => {
      // Record a COD payment for testOrder
      await Payment.create({
        paymentNumber: 'PAY-2026-000001',
        orderId: new mongoose.Types.ObjectId(testOrder.id),
        userId: customerUser._id,
        amount: testOrder.total,
        currency: 'PKR',
        method: PAYMENT_METHOD.CASH_ON_DELIVERY,
        provider: PAYMENT_PROVIDER.COD,
        status: 'PENDING',
        attempts: [],
      });

      // 1. Create shipment
      const createRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ carrier: CARRIER_TYPE.MANUAL });

      const shipmentId = createRes.body.data.id;

      // 2. Transition to READY_TO_SHIP
      await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.READY_TO_SHIP });

      // 3. Transition to SHIPPED succeeds for COD order with PENDING payment
      const shipRes = await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          status: SHIPMENT_STATUS.SHIPPED,
          trackingNumber: 'COD-TRK-777',
        });

      expect(shipRes.status).toBe(200);
      expect(shipRes.body.data.status).toBe(SHIPMENT_STATUS.SHIPPED);
    });

    it('validates state machine progression and synchronizes order status on DELIVERED', async () => {
      // Mark order PAID
      await Order.findByIdAndUpdate(testOrder.id, { paymentStatus: PAYMENT_STATUS.PAID });

      const createRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${testOrder.id}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ carrier: CARRIER_TYPE.MANUAL, trackingNumber: 'TRK-ABC-123' });

      const shipmentId = createRes.body.data.id;

      // Invalid transition: PENDING directly to DELIVERED
      const invalidRes = await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.DELIVERED });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error.code).toBe(ErrorCodes.ERR_SHIPMENT_INVALID_STATUS_TRANSITION);

      // Valid full progression: PENDING -> READY_TO_SHIP -> SHIPPED -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
      await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.READY_TO_SHIP });

      await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.SHIPPED });

      await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.IN_TRANSIT });

      await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.OUT_FOR_DELIVERY });

      const deliveredRes = await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.DELIVERED });

      expect(deliveredRes.status).toBe(200);
      expect(deliveredRes.body.data.status).toBe(SHIPMENT_STATUS.DELIVERED);
      expect(deliveredRes.body.data.deliveredAt).toBeDefined();

      // Check Order is now DELIVERED and completedAt is set
      const deliveredOrder = await Order.findById(testOrder.id);
      expect(deliveredOrder?.fulfillmentStatus).toBe(FULFILLMENT_STATUS.DELIVERED);
      expect(deliveredOrder?.status).toBe(ORDER_STATUS.DELIVERED);
      expect(deliveredOrder?.completedAt).toBeDefined();
    });
  });

  // --- 5. Order Cancellation & Shipment Lifecycle Safeguards ---
  describe('Order Cancellation & Shipment Lifecycle Safeguards', () => {
    it('cancels pending shipment when customer cancels order in PLACED status', async () => {
      await setupCheckoutWithItems(testVariant1._id.toString(), 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      const orderId = orderRes.body.data.order.id;

      // Admin creates pending shipment
      const shipRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${orderId}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ carrier: CARRIER_TYPE.MANUAL });

      const shipmentId = shipRes.body.data.id;

      // Customer cancels order
      const cancelRes = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed mind' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.order.status).toBe(ORDER_STATUS.CANCELLED);

      // Verify shipment is automatically CANCELLED
      const shipment = await Shipment.findById(shipmentId);
      expect(shipment?.status).toBe(SHIPMENT_STATUS.CANCELLED);
      expect(shipment?.cancelledAt).toBeDefined();
    });

    it('blocks order cancellation once shipment has been SHIPPED (SHIPPING-SEC-04)', async () => {
      await setupCheckoutWithItems(testVariant1._id.toString(), 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      const orderId = orderRes.body.data.order.id;
      await Order.findByIdAndUpdate(orderId, { paymentStatus: PAYMENT_STATUS.PAID });

      // Admin creates and advances shipment to SHIPPED
      const shipRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${orderId}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ carrier: CARRIER_TYPE.MANUAL, trackingNumber: 'TRK-999' });

      const shipmentId = shipRes.body.data.id;

      await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.READY_TO_SHIP });

      await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.SHIPPED });

      // Attempt customer cancellation
      const custCancelRes = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Try to cancel' });

      expect(custCancelRes.status).toBe(400);

      // Attempt admin cancellation
      const adminCancelRes = await request(app)
        .post(`/api/v1/admin/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Admin attempt to cancel shipped' });

      expect(adminCancelRes.status).toBe(400);
    });
  });

  // --- 6. Customer Tracking & Data Privacy Isolation ---
  describe('Customer Tracking & Data Privacy Isolation (SHIPPING-SEC-03, SHIPPING-SEC-10)', () => {
    let orderId: string;
    let shipmentId: string;

    beforeEach(async () => {
      await setupCheckoutWithItems(testVariant1._id.toString(), 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      orderId = orderRes.body.data.order.id;

      const shipRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${orderId}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          carrier: CARRIER_TYPE.MANUAL,
          carrierName: 'TCS Express',
          trackingNumber: 'TCS-12345678',
          trackingUrl: 'https://tcsexpress.com/track/TCS-12345678',
          internalNotes: 'SECRET_WAREHOUSE_NOTE: Shelf B-12 security sealed',
        });

      shipmentId = shipRes.body.data.id;
    });

    it('allows owning customer to view safe tracking DTO and strips internal notes & secrets (SHIPPING-SEC-03)', async () => {
      const trackRes = await request(app)
        .get(`/api/v1/shipping/orders/${orderId}/shipment`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(trackRes.status).toBe(200);
      expect(trackRes.body.success).toBe(true);
      const track = trackRes.body.data;
      expect(track.trackingNumber).toBe('TCS-12345678');
      expect(track.trackingUrl).toBe('https://tcsexpress.com/track/TCS-12345678');
      expect(track.carrierName).toBe('TCS Express');
      // Verify internalNotes is NOT exposed to customer
      expect(track.internalNotes).toBeUndefined();
      expect(JSON.stringify(track)).not.toContain('SECRET_WAREHOUSE_NOTE');
    });

    it('prevents IDOR: non-owning customer cannot access another user order shipment (SHIPPING-SEC-10)', async () => {
      // Bob tries to access Alice's shipment
      const trackRes = await request(app)
        .get(`/api/v1/shipping/orders/${orderId}/shipment`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(trackRes.status).toBe(404);
      expect(trackRes.body.error.code).toBe(ErrorCodes.ERR_ORDER_NOT_FOUND);
    });
  });

  // --- 7. Comprehensive RBAC Matrix Verification ---
  describe('RBAC Matrix Verification for Shipping Endpoints', () => {
    let orderId: string;
    let shipmentId: string;

    beforeEach(async () => {
      await setupCheckoutWithItems(testVariant1._id.toString(), 1);
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      orderId = orderRes.body.data.order.id;

      const shipRes = await request(app)
        .post(`/api/v1/admin/shipments/order/${orderId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ carrier: CARRIER_TYPE.MANUAL, trackingNumber: 'TRK-INIT' });

      shipmentId = shipRes.body.data.id;
    });

    it('verifies SUPER_ADMIN has full permissions (methods + shipments)', async () => {
      const listMethods = await request(app)
        .get('/api/v1/admin/shipping-methods')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(listMethods.status).toBe(200);

      const listShipments = await request(app)
        .get('/api/v1/admin/shipments')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(listShipments.status).toBe(200);
    });

    it('verifies ORDER_MANAGER can view and fulfill shipments but cannot manage shipping methods', async () => {
      // Can view shipments
      const listShipments = await request(app)
        .get('/api/v1/admin/shipments')
        .set('Authorization', `Bearer ${orderManagerToken}`);
      expect(listShipments.status).toBe(200);

      // Can update status
      const updateStatus = await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ status: SHIPMENT_STATUS.READY_TO_SHIP });
      expect(updateStatus.status).toBe(200);

      // Cannot create shipping methods
      const createMethod = await request(app)
        .post('/api/v1/admin/shipping-methods')
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          code: 'UNAUTH-METHOD',
          name: 'Unauthorized',
          baseFee: 10000,
          currency: 'PKR',
          estimatedMinDays: 1,
          estimatedMaxDays: 2,
        });
      expect(createMethod.status).toBe(403);
    });

    it('verifies CUSTOMER_SUPPORT has read-only access to shipments and cannot update status or methods', async () => {
      // Can read shipments
      const listShipments = await request(app)
        .get('/api/v1/admin/shipments')
        .set('Authorization', `Bearer ${customerSupportToken}`);
      expect(listShipments.status).toBe(200);

      // Cannot update shipment status
      const updateStatus = await request(app)
        .put(`/api/v1/admin/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${customerSupportToken}`)
        .send({ status: SHIPMENT_STATUS.READY_TO_SHIP });
      expect(updateStatus.status).toBe(403);
    });

    it('verifies PRODUCT_MANAGER and CUSTOMER are rejected from all admin shipping routes', async () => {
      const pmRes = await request(app)
        .get('/api/v1/admin/shipments')
        .set('Authorization', `Bearer ${productManagerToken}`);
      expect(pmRes.status).toBe(403);

      const custRes = await request(app)
        .get('/api/v1/admin/shipments')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(custRes.status).toBe(403);
    });
  });
});
