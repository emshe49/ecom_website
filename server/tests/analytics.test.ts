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
import { Category } from '../src/modules/catalog/categories/category.model.js';
import { Brand } from '../src/modules/catalog/brands/brand.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { Review } from '../src/modules/reviews/review.model.js';
import { Coupon } from '../src/modules/promotions/coupon.model.js';
import { Shipment } from '../src/modules/shipping/shipment.model.js';
import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';
import { ORDER_STATUS, PAYMENT_STATUS as ORDER_PAY_STATUS, FULFILLMENT_STATUS } from '../src/modules/orders/order.constants.js';
import { PAYMENT_METHOD, PAYMENT_PROVIDER, PAYMENT_STATUS as PAY_STATUS } from '../src/modules/payments/payment.constants.js';
import { PRODUCT_STATUS } from '../src/modules/catalog/products/product.constants.js';
import { REVIEW_STATUS } from '../src/modules/reviews/review.constants.js';
import { DISCOUNT_TYPE } from '../src/modules/promotions/promotion.constants.js';
import { SHIPMENT_STATUS } from '../src/modules/shipping/shipping.constants.js';

const app = createApp();

describe('Module 21: Analytics & Reports Engine', () => {
  let adminToken: string;
  let customerToken: string;
  let adminUserId: string;
  let customerUserId: string;
  let testCategory: any;
  let testBrand: any;
  let testProduct: any;
  let testVariant: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    // Clean up test data
    await User.deleteMany({ email: { $in: ['analytics_admin@example.com', 'analytics_cust@example.com', '=formula_hacker@example.com'] } });
    await Order.deleteMany({ 'customerSnapshot.email': { $in: ['analytics_cust@example.com', '=formula_hacker@example.com'] } });
    await Category.deleteMany({ slug: 'analytics-test-cat' });
    await Brand.deleteMany({ slug: 'analytics-test-brand' });
    await Product.deleteMany({ slug: 'analytics-test-prod' });
    await ProductVariant.deleteMany({ sku: 'ANALYTICS-SKU-001' });
    await Coupon.deleteMany({ code: 'ANALYTICS20' });

    // 1. Admin & Customer Users
    const admin = await User.create({
      email: 'analytics_admin@example.com',
      passwordHash: 'hashed_secret_admin',
      firstName: 'Admin',
      lastName: 'Analytics',
      role: 'ADMIN',
      isEmailVerified: true,
      isActive: true,
    });
    adminUserId = admin._id.toString();
    adminToken = generateAccessToken({ sub: adminUserId, role: 'ADMIN', email: admin.email });

    const customer = await User.create({
      email: 'analytics_cust@example.com',
      passwordHash: 'hashed_secret_cust',
      firstName: 'Shopper',
      lastName: 'Customer',
      role: 'CUSTOMER',
      isEmailVerified: true,
      isActive: true,
    });
    customerUserId = customer._id.toString();
    customerToken = generateAccessToken({ sub: customerUserId, role: 'CUSTOMER', email: customer.email });

    // 2. Category, Brand, Product
    testCategory = await Category.create({
      name: 'Analytics Test Category',
      slug: 'analytics-test-cat',
      isActive: true,
    });

    testBrand = await Brand.create({
      name: 'Analytics Test Brand',
      normalizedName: 'analytics test brand',
      slug: 'analytics-test-brand',
      isActive: true,
    });

    testProduct = await Product.create({
      name: 'Analytics Test Product',
      slug: 'analytics-test-prod',
      categoryId: testCategory._id,
      brandId: testBrand._id,
      status: PRODUCT_STATUS.ACTIVE,
      images: [{ url: 'http://example.com/img.jpg', isPrimary: true, sortOrder: 0 }],
    });

    testVariant = await ProductVariant.create({
      productId: testProduct._id,
      sku: 'ANALYTICS-SKU-001',
      price: 10000, // $100.00
      attributeSignature: 'default',
      isActive: true,
    });

    await Inventory.create({
      variantId: testVariant._id,
      onHand: 25,
      reserved: 2,
      lowStockThreshold: 10,
    });

    const mockAddress = {
      sourceAddressId: new mongoose.Types.ObjectId(),
      fullName: 'Shopper Customer',
      phone: '1234567890',
      addressLine1: '123 Test Rd',
      city: 'New York',
      stateProvince: 'NY',
      postalCode: '10001',
      country: 'US',
    };

    const mockShippingMethod = {
      shippingMethodId: new mongoose.Types.ObjectId(),
      code: 'EXPRESS',
      name: 'Express Courier',
      fee: 1500,
      currency: 'USD',
      estimatedMinDays: 1,
      estimatedMaxDays: 2,
    };

    // 3. Test Orders
    const testOrder1 = await Order.create({
      orderNumber: 'ORD-ANALYTICS-001',
      userId: customer._id,
      checkoutSessionId: new mongoose.Types.ObjectId(),
      customerSnapshot: {
        userId: customer._id,
        firstName: 'Shopper',
        lastName: 'Customer',
        email: 'analytics_cust@example.com',
      },
      shippingAddress: mockAddress,
      billingAddress: mockAddress,
      items: [
        {
          productId: testProduct._id,
          variantId: testVariant._id,
          productName: testProduct.name,
          productSlug: testProduct.slug,
          sku: 'ANALYTICS-SKU-001',
          variantAttributes: [],
          unitPrice: 10000,
          quantity: 2,
          lineTotal: 20000,
          discountAmount: 2000,
          finalLineTotal: 18000,
        },
      ],
      subtotal: 20000,
      discountAmount: 2000,
      shippingFee: 1500,
      total: 21100, // $211.00
      currency: 'USD',
      status: ORDER_STATUS.CONFIRMED,
      paymentStatus: ORDER_PAY_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.UNFULFILLED,
      shippingMethod: mockShippingMethod,
      placedAt: new Date(),
    });

    // Second order from same customer to qualify as repeat customer
    await Order.create({
      orderNumber: 'ORD-ANALYTICS-002',
      userId: customer._id,
      checkoutSessionId: new mongoose.Types.ObjectId(),
      customerSnapshot: {
        userId: customer._id,
        firstName: 'Shopper',
        lastName: 'Customer',
        email: 'analytics_cust@example.com',
      },
      shippingAddress: mockAddress,
      billingAddress: mockAddress,
      items: [
        {
          productId: testProduct._id,
          variantId: testVariant._id,
          productName: testProduct.name,
          productSlug: testProduct.slug,
          sku: 'ANALYTICS-SKU-001',
          variantAttributes: [],
          unitPrice: 10000,
          quantity: 1,
          lineTotal: 10000,
          discountAmount: 0,
          finalLineTotal: 10000,
        },
      ],
      subtotal: 10000,
      discountAmount: 0,
      shippingFee: 500,
      total: 11300,
      currency: 'USD',
      status: ORDER_STATUS.DELIVERED,
      paymentStatus: ORDER_PAY_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
      shippingMethod: { ...mockShippingMethod, code: 'STANDARD', fee: 500 },
      placedAt: new Date(),
    });

    // Formula injection test order
    const hackerAddress = {
      sourceAddressId: new mongoose.Types.ObjectId(),
      fullName: '@cmd',
      phone: '1234567890',
      addressLine1: '123 Attack Rd',
      city: 'NY',
      stateProvince: 'NY',
      country: 'US',
    };

    await Order.create({
      orderNumber: '=1+1',
      userId: customer._id,
      checkoutSessionId: new mongoose.Types.ObjectId(),
      customerSnapshot: {
        userId: customer._id,
        firstName: '@cmd',
        lastName: '+exec',
        email: '=formula_hacker@example.com',
      },
      shippingAddress: hackerAddress,
      billingAddress: hackerAddress,
      items: [
        {
          productId: testProduct._id,
          variantId: testVariant._id,
          productName: '=cmd|/c calc',
          productSlug: 'attack-slug',
          sku: '@SKU-INJECT',
          variantAttributes: [],
          unitPrice: 5000,
          quantity: 1,
          lineTotal: 5000,
          discountAmount: 0,
          finalLineTotal: 5000,
        },
      ],
      subtotal: 5000,
      discountAmount: 0,
      shippingFee: 0,
      total: 5000,
      currency: 'USD',
      status: ORDER_STATUS.CONFIRMED,
      paymentStatus: ORDER_PAY_STATUS.PAID,
      fulfillmentStatus: FULFILLMENT_STATUS.UNFULFILLED,
      shippingMethod: { ...mockShippingMethod, fee: 0 },
      placedAt: new Date(),
    });

    // 4. Test Payment
    await Payment.create({
      paymentNumber: 'PAY-ANALYTICS-001',
      orderId: testOrder1._id,
      userId: customerUserId,
      amount: 21100,
      currency: 'USD',
      method: PAYMENT_METHOD.ONLINE,
      provider: PAYMENT_PROVIDER.TEST,
      status: PAY_STATUS.SUCCEEDED,
      paidAt: new Date(),
    });

    // 5. Test Review
    await Review.create({
      userId: customerUserId,
      productId: testProduct._id,
      rating: 5,
      title: 'Outstanding Quality!',
      body: 'This product exceeded my expectations in every aspect.',
      status: REVIEW_STATUS.PUBLISHED,
      isVerifiedPurchase: true,
      orderId: testOrder1._id,
    });

    // 6. Test Coupon
    await Coupon.create({
      name: 'Analytics 20% off',
      code: 'ANALYTICS20',
      normalizedCode: 'ANALYTICS20',
      description: 'Analytics 20% off',
      discountType: DISCOUNT_TYPE.PERCENTAGE,
      discountValue: 20,
      redemptionsCount: 1,
      active: true,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
    });

    // 7. Test Shipment
    await Shipment.create({
      shipmentNumber: 'SHP-ANALYTICS-001',
      orderId: testOrder1._id,
      orderNumber: 'ORD-ANALYTICS-001',
      userId: customer._id,
      carrier: 'FEDEX',
      carrierName: 'FedEx Priority',
      status: SHIPMENT_STATUS.DELIVERED,
      trackingNumber: 'TRK-987654321',
      customerSnapshot: testOrder1.customerSnapshot,
      shippingAddress: mockAddress,
      shippingMethod: mockShippingMethod,
      items: testOrder1.items,
      createdBy: admin._id,
      shippedAt: new Date(Date.now() - 48 * 3600 * 1000),
      deliveredAt: new Date(Date.now() - 24 * 3600 * 1000), // 24 hours transit duration
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['analytics_admin@example.com', 'analytics_cust@example.com', '=formula_hacker@example.com'] } });
    await Order.deleteMany({ 'customerSnapshot.email': { $in: ['analytics_cust@example.com', '=formula_hacker@example.com'] } });
    await Category.deleteMany({ slug: 'analytics-test-cat' });
    await Brand.deleteMany({ slug: 'analytics-test-brand' });
    await Product.deleteMany({ slug: 'analytics-test-prod' });
    await ProductVariant.deleteMany({ sku: 'ANALYTICS-SKU-001' });
    await Coupon.deleteMany({ code: 'ANALYTICS20' });
    await Payment.deleteMany({ paymentNumber: 'PAY-ANALYTICS-001' });
    await Shipment.deleteMany({ shipmentNumber: 'SHP-ANALYTICS-001' });
  });

  describe('Security & RBAC Controls', () => {
    it('ANALYTICS-SEC-01: Rejects unauthenticated requests to analytics endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/analytics/sales');
      expect(res.status).toBe(401);
    });

    it('ANALYTICS-SEC-02: Rejects unauthorized customer requests with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/sales')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('ANALYTICS-SEC-03: Allows admin users with ANALYTICS_READ permission to read reports', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/sales')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.range).toBeDefined();
    });
  });

  describe('Input & Date Validation', () => {
    it('Rejects invalid date format with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/sales?from=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('Rejects from date greater than to date with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/sales?from=2026-05-01T00:00:00.000Z&to=2026-04-01T00:00:00.000Z')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('Rejects date range exceeding 3 years (1096 days) with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/sales?from=2020-01-01T00:00:00.000Z&to=2025-01-01T00:00:00.000Z')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('13 Core Analytics Reports', () => {
    it('1. Sales Report: Returns gross revenue, net revenue, trend, and grouped table', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/sales?groupBy=day')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.summary.grossRevenue.current).toBeGreaterThanOrEqual(33000);
      expect(data.summary.netRevenue.current).toBeGreaterThanOrEqual(33000);
      expect(data.trend).toBeInstanceOf(Array);
      expect(data.items).toBeInstanceOf(Array);
    });

    it('2. Orders Report: Returns status breakdowns and order ledger', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.summary.totalOrders.current).toBeGreaterThanOrEqual(3);
      expect(data.breakdown.byStatus).toBeInstanceOf(Array);
      expect(data.breakdown.byPaymentStatus).toBeInstanceOf(Array);
      expect(data.items.length).toBeGreaterThan(0);
    });

    it('3. Payments Report: Returns payment metrics and method breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/payments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.summary.successfulPayments.current).toBeGreaterThanOrEqual(1);
      expect(data.breakdown.byMethod).toBeInstanceOf(Array);
      expect(data.breakdown.byProvider).toBeInstanceOf(Array);
    });

    it('4. Products Report: Computes product revenue from immutable order snapshots', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.summary.totalProductsSold).toBeGreaterThanOrEqual(1);
      expect(data.items.some((p: any) => p.productName === 'Analytics Test Product')).toBe(true);
    });

    it('5. Categories Report: Groups sales by category and includes attribution note', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.attributionNote).toBeDefined();
      expect(data.items.some((c: any) => c.categoryName === 'Analytics Test Category')).toBe(true);
    });

    it('6. Brands Report: Groups sales by brand and includes attribution note', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/brands')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.attributionNote).toBeDefined();
      expect(data.items.some((b: any) => b.brandName === 'Analytics Test Brand')).toBe(true);
    });

    it('7. Customers Report: Computes repeat customer rate for accounts with >= 2 paid orders', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.summary.repeatCustomers.current).toBeGreaterThanOrEqual(1);
      expect(data.summary.repeatCustomerRate).toBeGreaterThan(0);
      expect(data.repeatDefinition).toBeDefined();
    });

    it('8. Inventory Report: Returns movement summary and stock health metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/inventory')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.stockHealth.totalVariants).toBeGreaterThanOrEqual(1);
      expect(data.items.some((i: any) => i.sku === 'ANALYTICS-SKU-001')).toBe(true);
    });

    it('9. Returns & 10. Refunds Reports: Return valid payload structure', async () => {
      const retRes = await request(app)
        .get('/api/v1/admin/analytics/returns')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(retRes.status).toBe(200);
      expect(retRes.body.data.reasonsBreakdown).toBeInstanceOf(Array);

      const refRes = await request(app)
        .get('/api/v1/admin/analytics/refunds')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(refRes.status).toBe(200);
      expect(refRes.body.data.methodBreakdown).toBeInstanceOf(Array);
    });

    it('11. Promotions Report: Returns coupon redemption performance', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/promotions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.coupons.some((c: any) => c.couponCode === 'ANALYTICS20')).toBe(true);
    });

    it('12. Shipping Report: Returns average transit hours and carrier breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/shipping')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.summary.averageDeliveryHours).toBeGreaterThanOrEqual(23);
      expect(data.carrierBreakdown.some((c: any) => c.carrier.includes('FedEx'))).toBe(true);
    });

    it('13. Reviews Report: Returns rating distribution and sentiment averages', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/reviews')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.summary.averageRating).toBe(5);
      expect(data.ratingDistribution).toBeInstanceOf(Array);
      expect(data.ratingDistribution.find((r: any) => r.rating === 5)?.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('CSV Exports & Formula Injection Neutralization', () => {
    it('Exports Sales CSV with proper headers and UTF-8 BOM', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/sales/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('.csv');
      expect(res.text.startsWith('\uFEFF')).toBe(true);
    });

    it('ANALYTICS-SEC-10: Neutralizes formula injection characters (=, +, -, @) in CSV cells', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/orders/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const csvContent = res.text;
      // Formula-prefixed orderNumber '=1+1' must be sanitized to "'=1+1"
      expect(csvContent).toContain("'=1+1");
      // Customer cell '@cmd +exec' must be sanitized to "'@cmd +exec"
      expect(csvContent).toContain("'@cmd +exec");
      // Email cell '=formula_hacker@example.com' must be sanitized to "'=formula_hacker@example.com"
      expect(csvContent).toContain("'=formula_hacker@example.com");
    });
  });
});
