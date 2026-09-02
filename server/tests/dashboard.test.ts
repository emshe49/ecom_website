import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { Payment } from '../src/modules/payments/payment.model.js';
import { Product } from '../src/modules/catalog/products/product.model.js';
import { ProductVariant } from '../src/modules/catalog/products/product-variant.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { Review } from '../src/modules/reviews/review.model.js';
import { Promotion } from '../src/modules/promotions/promotion.model.js';
import { Coupon } from '../src/modules/promotions/coupon.model.js';
import { Category } from '../src/modules/catalog/categories/category.model.js';
import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/modules/orders/order.constants.js';
import { PAYMENT_METHOD, PAYMENT_PROVIDER, PAYMENT_STATUS as PAY_STATUS } from '../src/modules/payments/payment.constants.js';
import { PRODUCT_STATUS } from '../src/modules/catalog/products/product.constants.js';
import { REVIEW_STATUS } from '../src/modules/reviews/review.constants.js';
import { DISCOUNT_TYPE } from '../src/modules/promotions/promotion.constants.js';

const app = createApp();

describe('Module 20: Admin Dashboard & Operational Overview', () => {
  let adminToken: string;
  let customerToken: string;
  let adminUserId: string;
  let customerUserId: string;
  let testCategory: any;
  let testProduct: any;
  let testVariant: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    // Clean up test data
    await User.deleteMany({ email: { $in: ['dash_admin@example.com', 'dash_cust@example.com', 'dash_newcust@example.com'] } });
    await Order.deleteMany({ 'customerSnapshot.email': { $in: ['dash_cust@example.com'] } });
    await Category.deleteMany({ slug: 'dash-test-cat' });
    await Product.deleteMany({ slug: 'dash-test-prod' });
    await Promotion.deleteMany({ name: 'Dash Test Promo' });
    await Coupon.deleteMany({ code: 'DASHTEST10' });

    // 1. Create Admin & Customer Users
    const admin = await User.create({
      email: 'dash_admin@example.com',
      passwordHash: 'hashed_secret_admin',
      firstName: 'Admin',
      lastName: 'Dashboard',
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    });
    adminUserId = admin._id.toString();
    adminToken = generateAccessToken({ sub: adminUserId, role: 'ADMIN', email: admin.email });

    const customer = await User.create({
      email: 'dash_cust@example.com',
      passwordHash: 'hashed_secret_cust',
      firstName: 'Customer',
      lastName: 'Shopper',
      role: 'CUSTOMER',
      isEmailVerified: true,
      isActive: true,
    });
    customerUserId = customer._id.toString();
    customerToken = generateAccessToken({ sub: customerUserId, role: 'CUSTOMER', email: customer.email });

    // 2. Create Catalog Items
    testCategory = await Category.create({
      name: 'Dashboard Test Category',
      slug: 'dash-test-cat',
      isActive: true,
    });

    testProduct = await Product.create({
      name: 'Dashboard Test Product',
      slug: 'dash-test-prod',
      categoryId: testCategory._id,
      status: PRODUCT_STATUS.ACTIVE,
      images: [{ url: 'http://example.com/img.jpg', isPrimary: true, sortOrder: 0 }],
    });

    testVariant = await ProductVariant.create({
      productId: testProduct._id,
      sku: 'DASH-SKU-001',
      price: 5000, // $50.00
      attributeSignature: 'default',
      isActive: true,
    });

    // 3. Create Low Stock Inventory
    await Inventory.create({
      variantId: testVariant._id,
      onHand: 3,
      reserved: 1,
      lowStockThreshold: 5, // Available = 2 <= 5 => Low Stock!
    });

    // 4. Create Active Promotion & Coupon
    await Promotion.create({
      name: 'Dash Test Promo',
      discountType: DISCOUNT_TYPE.PERCENTAGE,
      discountValue: 10,
      active: true,
    });

    await Coupon.create({
      name: 'Dash Test Coupon',
      code: 'DASHTEST10',
      normalizedCode: 'DASHTEST10',
      discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
      discountValue: 1000,
      active: true,
    });

    // 5. Create Reviews
    await Review.create({
      productId: testProduct._id,
      userId: customer._id,
      orderId: new mongoose.Types.ObjectId(),
      rating: 5,
      body: 'Excellent product for dashboard testing!',
      status: REVIEW_STATUS.PUBLISHED,
    });

    // 6. Create Paid and Unpaid Orders
    const now = new Date();
    const paidOrder = await Order.create({
      orderNumber: 'ORD-DASH-001',
      userId: customer._id,
      checkoutSessionId: new mongoose.Types.ObjectId(),
      status: ORDER_STATUS.PROCESSING,
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.UNFULFILLED,
      items: [
        {
          productId: testProduct._id,
          variantId: testVariant._id,
          productName: testProduct.name,
          productSlug: testProduct.slug,
          sku: testVariant.sku,
          variantAttributes: [],
          quantity: 2,
          unitPrice: 5000,
          lineTotal: 10000,
        },
      ],
      customerSnapshot: {
        userId: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      },
      shippingAddress: {
        sourceAddressId: new mongoose.Types.ObjectId(),
        fullName: 'Customer Shopper',
        phone: '1234567890',
        country: 'US',
        stateProvince: 'CA',
        city: 'San Francisco',
        addressLine1: '123 Market St',
      },
      billingAddress: {
        sourceAddressId: new mongoose.Types.ObjectId(),
        fullName: 'Customer Shopper',
        phone: '1234567890',
        country: 'US',
        stateProvince: 'CA',
        city: 'San Francisco',
        addressLine1: '123 Market St',
      },
      shippingMethod: {
        shippingMethodId: new mongoose.Types.ObjectId(),
        code: 'STANDARD',
        name: 'Standard Ground',
        fee: 500,
        currency: 'USD',
        estimatedMinDays: 2,
        estimatedMaxDays: 5,
      },
      subtotal: 10000,
      couponDiscountAmount: 0,
      promotionDiscountAmount: 0,
      discountAmount: 0,
      shippingFee: 500,
      total: 10500, // $105.00
      currency: 'USD',
      placedAt: now,
    });

    await Payment.create({
      orderId: paidOrder._id,
      userId: customer._id,
      paymentNumber: 'PAY-DASH-001',
      amount: 10500,
      currency: 'USD',
      method: PAYMENT_METHOD.ONLINE,
      status: PAY_STATUS.SUCCEEDED,
      provider: PAYMENT_PROVIDER.TEST,
      paidAt: now,
    });

    // Create a failed payment in this period to trigger action alert
    await Payment.create({
      orderId: new mongoose.Types.ObjectId(),
      userId: customer._id,
      paymentNumber: 'PAY-DASH-FAILED',
      amount: 5000,
      currency: 'USD',
      method: PAYMENT_METHOD.ONLINE,
      status: PAY_STATUS.FAILED,
      provider: PAYMENT_PROVIDER.TEST,
      failedAt: now,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['dash_admin@example.com', 'dash_cust@example.com'] } });
    await Order.deleteMany({ 'customerSnapshot.email': 'dash_cust@example.com' });
    await Payment.deleteMany({ paymentNumber: { $in: ['PAY-DASH-001', 'PAY-DASH-FAILED'] } });
    await Review.deleteMany({ body: 'Excellent product for dashboard testing!' });
    await Inventory.deleteMany({ variantId: testVariant?._id });
    await ProductVariant.deleteMany({ sku: 'DASH-SKU-001' });
    await Product.deleteMany({ slug: 'dash-test-prod' });
    await Category.deleteMany({ slug: 'dash-test-cat' });
    await Promotion.deleteMany({ name: 'Dash Test Promo' });
    await Coupon.deleteMany({ code: 'DASHTEST10' });
    await mongoose.connection.close();
  });

  describe('DASH-SEC-01 & DASH-SEC-02: Authentication & RBAC Security', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject customer role requests lacking dashboard:read with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow admin role with dashboard:read to access dashboard with 200', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Date Range Query Validation', () => {
    it('should return 400 when from date is invalid ISO string', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?from=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('should return 400 when from date is greater than to date', async () => {
      const from = new Date(Date.now() + 100000).toISOString();
      const to = new Date().toISOString();
      const res = await request(app)
        .get(`/api/v1/admin/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('should return 400 when interval is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?interval=invalid_interval')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('Dashboard Metrics & Aggregations Verification', () => {
    it('should return accurate KPIs and metadata structure', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { meta, kpis, breakdowns, trends, operations, catalogSummary } = res.body.data;

      // Meta verification
      expect(meta.from).toBeDefined();
      expect(meta.to).toBeDefined();
      expect(meta.currency).toBe('USD');

      // KPIs verification
      expect(kpis.revenue.current).toBeGreaterThanOrEqual(10500);
      expect(kpis.orders.current).toBeGreaterThanOrEqual(1);
      expect(kpis.averageOrderValue.current).toBeGreaterThanOrEqual(10500);
      expect(kpis.pendingFulfillment.current).toBeGreaterThanOrEqual(1);
      expect(kpis.lowStockCount.current).toBeGreaterThanOrEqual(1);

      // Breakdowns verification
      expect(Array.isArray(breakdowns.ordersByStatus)).toBe(true);
      expect(Array.isArray(breakdowns.ordersByPaymentStatus)).toBe(true);
      expect(Array.isArray(breakdowns.paymentsByMethod)).toBe(true);

      // Trends verification
      expect(Array.isArray(trends.timeseries)).toBe(true);

      // Operations verification
      expect(operations.actionItems.length).toBeGreaterThanOrEqual(1);
      expect(operations.lowStockAlerts.length).toBeGreaterThanOrEqual(1);
      expect(operations.lowStockAlerts.some((alert: any) => alert.sku === 'DASH-SKU-001')).toBe(true);
      expect(operations.recentOrders.length).toBeGreaterThanOrEqual(1);
      expect(operations.recentOrders.some((ord: any) => ord.orderNumber === 'ORD-DASH-001')).toBe(true);

      // Catalog Summary verification
      expect(catalogSummary.totalProducts).toBeGreaterThanOrEqual(1);
      expect(catalogSummary.totalReviews).toBeGreaterThanOrEqual(1);
      expect(catalogSummary.averageReviewRating).toBe(5);
      expect(catalogSummary.activePromotionsCount).toBeGreaterThanOrEqual(1);
      expect(catalogSummary.activeCouponsCount).toBeGreaterThanOrEqual(1);
    });

    it('should not expose sensitive customer credentials or hashes anywhere in output', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toContain('passwordHash');
      expect(responseString).not.toContain('hashed_secret');
      expect(responseString).not.toContain('emailVerificationTokenHash');
    });
  });
});
