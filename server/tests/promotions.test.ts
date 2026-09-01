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
import { Cart } from '../src/modules/cart/cart.model.js';
import { Address } from '../src/modules/addresses/address.model.js';
import { ShippingMethod } from '../src/modules/shipping/shipping-method.model.js';
import { CheckoutSession } from '../src/modules/checkout/checkout.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { Coupon } from '../src/modules/promotions/coupon.model.js';
import { Promotion } from '../src/modules/promotions/promotion.model.js';
import { CouponRedemption } from '../src/modules/promotions/coupon-redemption.model.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import { DISCOUNT_TYPE, REDEMPTION_STATUS } from '../src/modules/promotions/promotion.constants.js';
import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';
import { ErrorCodes } from '../src/shared/errors/error-codes.js';
import { CHECKOUT_STATUS } from '../src/modules/checkout/checkout.constants.js';
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/modules/orders/order.constants.js';

describe('Module 16: Coupons & Promotions Integration Tests', () => {
  let app: any;
  let customerUser: any;
  let customerToken: string;
  let otherCustomerUser: any;
  let otherCustomerToken: string;
  let superAdminUser: any;
  let superAdminToken: string;
  let productManagerUser: any;
  let productManagerToken: string;
  let customerSupportUser: any;
  let customerSupportToken: string;

  let parentCategory: any;
  let childCategory: any;
  let testBrand: any;
  let testProduct1: any;
  let testProduct2: any;
  let testVariant1: any;
  let testVariant2: any;
  let testAddress: any;
  let testShippingMethod: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    app = createApp();
  });

  beforeEach(async () => {
    // Clear collections
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Brand.deleteMany({}),
      Product.deleteMany({}),
      ProductVariant.deleteMany({}),
      Inventory.deleteMany({}),
      Cart.deleteMany({}),
      Address.deleteMany({}),
      ShippingMethod.deleteMany({}),
      CheckoutSession.deleteMany({}),
      Order.deleteMany({}),
      Coupon.deleteMany({}),
      Promotion.deleteMany({}),
      CouponRedemption.deleteMany({}),
    ]);

    // Create users
    customerUser = await User.create({
      firstName: 'Alice',
      lastName: 'Customer',
      email: 'alice@example.com',
      passwordHash: 'hashed_password',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = generateAccessToken({
      sub: customerUser._id.toString(),
      role: ROLES.CUSTOMER,
      email: customerUser.email,
    });

    otherCustomerUser = await User.create({
      firstName: 'Bob',
      lastName: 'Customer',
      email: 'bob@example.com',
      passwordHash: 'hashed_password',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    otherCustomerToken = generateAccessToken({
      sub: otherCustomerUser._id.toString(),
      role: ROLES.CUSTOMER,
      email: otherCustomerUser.email,
    });

    superAdminUser = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'hashed_password',
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    superAdminToken = generateAccessToken({
      sub: superAdminUser._id.toString(),
      role: ROLES.SUPER_ADMIN,
      email: superAdminUser.email,
    });

    productManagerUser = await User.create({
      firstName: 'Product',
      lastName: 'Manager',
      email: 'pm@example.com',
      passwordHash: 'hashed_password',
      role: ROLES.PRODUCT_MANAGER,
      isEmailVerified: true,
      isActive: true,
    });
    productManagerToken = generateAccessToken({
      sub: productManagerUser._id.toString(),
      role: ROLES.PRODUCT_MANAGER,
      email: productManagerUser.email,
    });

    customerSupportUser = await User.create({
      firstName: 'Customer',
      lastName: 'Support',
      email: 'support@example.com',
      passwordHash: 'hashed_password',
      role: ROLES.CUSTOMER_SUPPORT,
      isEmailVerified: true,
      isActive: true,
    });
    customerSupportToken = generateAccessToken({
      sub: customerSupportUser._id.toString(),
      role: ROLES.CUSTOMER_SUPPORT,
      email: customerSupportUser.email,
    });

    // Create Categories with hierarchy
    parentCategory = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      isActive: true,
    });
    childCategory = await Category.create({
      name: 'Smartphones',
      slug: 'smartphones',
      parentId: parentCategory._id,
      isActive: true,
    });

    // Create Brand
    testBrand = await Brand.create({
      name: 'Apex Brands',
      normalizedName: 'apex brands',
      slug: 'apex-brands',
      isActive: true,
    });

    // Create Products & Variants
    testProduct1 = await Product.create({
      name: 'Flagship Phone',
      slug: 'flagship-phone',
      categoryId: childCategory._id,
      brandId: testBrand._id,
      status: 'ACTIVE',
      images: [{ url: 'https://images.local/phone.jpg', isPrimary: true, sortOrder: 0 }],
      attributes: [],
      tags: [],
    });
    testVariant1 = await ProductVariant.create({
      productId: testProduct1._id,
      sku: 'PHONE-BLK',
      name: 'Black Phone',
      price: 10000, // PKR 100.00
      costPrice: 7000,
      isActive: true,
      attributes: [{ name: 'Color', value: 'Black' }],
      attributeSignature: 'color:black',
    });
    await Inventory.create({
      variantId: testVariant1._id,
      onHand: 100,
      reserved: 0,
    });

    testProduct2 = await Product.create({
      name: 'Budget Earbuds',
      slug: 'budget-earbuds',
      categoryId: parentCategory._id,
      brandId: testBrand._id,
      status: 'ACTIVE',
      images: [{ url: 'https://images.local/earbuds.jpg', isPrimary: true, sortOrder: 0 }],
      attributes: [],
      tags: [],
    });
    testVariant2 = await ProductVariant.create({
      productId: testProduct2._id,
      sku: 'EARBUD-WHT',
      name: 'White Earbuds',
      price: 2000, // PKR 20.00
      costPrice: 1200,
      isActive: true,
      attributes: [{ name: 'Color', value: 'White' }],
      attributeSignature: 'color:white',
    });
    await Inventory.create({
      variantId: testVariant2._id,
      onHand: 100,
      reserved: 0,
    });

    // Create Address & ShippingMethod
    testAddress = await Address.create({
      userId: customerUser._id,
      fullName: 'Alice Customer',
      phone: '+923001234567',
      country: 'PK',
      stateProvince: 'Punjab',
      city: 'Lahore',
      addressLine1: '123 Main Blvd',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    testShippingMethod = await ShippingMethod.create({
      code: 'EXPRESS',
      name: 'Express Delivery',
      baseFee: 500,
      freeShippingThreshold: null,
      currency: 'PKR',
      estimatedMinDays: 1,
      estimatedMaxDays: 2,
      active: true,
    });
  });

  // Helper to setup active checkout session for customerUser
  async function setupActiveCheckout(qty1 = 1, qty2 = 0) {
    const items = [
      {
        variantId: testVariant1._id.toString(),
        quantity: qty1,
      },
    ];
    if (qty2 > 0) {
      items.push({
        variantId: testVariant2._id.toString(),
        quantity: qty2,
      });
    }

    // Add to cart
    await Cart.create({
      userId: customerUser._id,
      items: items.map((it) => ({
        variantId: it.variantId,
        quantity: it.quantity,
        addedPrice: it.variantId === testVariant1._id.toString() ? 10000 : 2000,
      })),
      subtotal: qty1 * 10000 + qty2 * 2000,
      currency: 'PKR',
    });

    // Create checkout
    const res = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shippingAddressId: testAddress._id.toString(),
        billingSameAsShipping: true,
        shippingMethodId: testShippingMethod._id.toString(),
      });

    return res.body.data;
  }

  // ==========================================
  // 1. ADMIN COUPON CRUD & PERMISSIONS
  // ==========================================
  describe('Admin Coupon Management & RBAC', () => {
    it('allows PRODUCT_MANAGER to create percentage coupon', async () => {
      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          code: 'save20',
          name: 'Save 20% Off',
          discountType: DISCOUNT_TYPE.PERCENTAGE,
          discountValue: 20, // 20%
          maxDiscountAmount: 3000,
          minimumOrderAmount: 5000,
          startsAt: new Date(Date.now() - 3600000).toISOString(),
          endsAt: new Date(Date.now() + 86400000).toISOString(),
          active: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('SAVE20');
      expect(res.body.data.discountType).toBe(DISCOUNT_TYPE.PERCENTAGE);
      expect(res.body.data.discountValue).toBe(20);
      expect(res.body.data.redemptionCount).toBe(0);
    });

    it('rejects duplicate coupon codes case-insensitively', async () => {
      await Coupon.create({
        code: 'WELCOME10',
        normalizedCode: 'WELCOME10',
        name: 'Welcome 10',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 1000,
        createdBy: superAdminUser._id,
      });

      const res = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'welcome10',
          name: 'Duplicate Welcome',
          discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
          discountValue: 500,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_COUPON_ALREADY_EXISTS);
    });

    it('allows CUSTOMER_SUPPORT to read coupons but not create', async () => {
      const readRes = await request(app)
        .get('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${customerSupportToken}`);
      expect(readRes.status).toBe(200);

      const createRes = await request(app)
        .post('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${customerSupportToken}`)
        .send({
          code: 'TEST',
          name: 'Test',
          discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
          discountValue: 100,
        });
      expect(createRes.status).toBe(403);
    });

    it('rejects regular customer from admin coupon routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/coupons')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 2. ADMIN PROMOTION CRUD & PERMISSIONS
  // ==========================================
  describe('Admin Promotion Management & RBAC', () => {
    it('allows SUPER_ADMIN to create automatic promotion', async () => {
      const res = await request(app)
        .post('/api/v1/admin/promotions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Flash Sale 15%',
          discountType: DISCOUNT_TYPE.PERCENTAGE,
          discountValue: 15,
          maxDiscountAmount: 2000,
          priority: 10,
          stackable: true,
          active: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Flash Sale 15%');
      expect(res.body.data.stackable).toBe(true);
      expect(res.body.data.priority).toBe(10);
    });

    it('allows updating promotion priority and stackable flag', async () => {
      const promo = await Promotion.create({
        name: 'Weekend Discount',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 1500,
        priority: 5,
        stackable: false,
        createdBy: superAdminUser._id,
      });

      const res = await request(app)
        .patch(`/api/v1/admin/promotions/${promo._id.toString()}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          priority: 25,
          stackable: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.priority).toBe(25);
      expect(res.body.data.stackable).toBe(true);
    });
  });

  // ==========================================
  // 3. DISCOUNT ENGINE & ELIGIBILITY RULES
  // ==========================================
  describe('Discount Rules & Hierarchy Eligibility', () => {
    it('applies category discounts to subcategories (descendant inheritance)', async () => {
      // Coupon targeting parent category 'Electronics'
      const coupon = await Coupon.create({
        code: 'ELECTRO10',
        normalizedCode: 'ELECTRO10',
        name: 'Electronics 10% Off',
        discountType: DISCOUNT_TYPE.PERCENTAGE,
        discountValue: 10, // 10%
        eligibleCategoryIds: [parentCategory._id],
        active: true,
        createdBy: superAdminUser._id,
      });

      // Product1 is in childCategory 'Smartphones' whose parent is 'Electronics'
      await setupActiveCheckout(1, 0); // 10,000 subtotal

      const applyRes = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'ELECTRO10' });

      expect(applyRes.status).toBe(200);
      expect(applyRes.body.data.coupon.code).toBe('ELECTRO10');
      // 10% of 10000 = 1000 discount
      expect(applyRes.body.data.couponDiscountAmount).toBe(1000);
      expect(applyRes.body.data.discountAmount).toBe(1000);
      expect(applyRes.body.data.total).toBe(10000 - 1000 + 500); // subtotal - discount + shippingFee
    });

    it('enforces product exclusions over category inclusions (PROMO-SEC-08)', async () => {
      // Coupon includes Electronics category but specifically excludes Phone variant product
      await Coupon.create({
        code: 'EXCLUDEPHONE',
        normalizedCode: 'EXCLUDEPHONE',
        name: 'Electronics except phone',
        discountType: DISCOUNT_TYPE.PERCENTAGE,
        discountValue: 20, // 20%
        eligibleCategoryIds: [parentCategory._id],
        excludedProductIds: [testProduct1._id], // Exclusion wins!
        active: true,
        createdBy: superAdminUser._id,
      });

      await setupActiveCheckout(1, 0); // Only Phone in cart

      const applyRes = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'EXCLUDEPHONE' });

      expect(applyRes.status).toBe(400);
      expect(applyRes.body.error.code).toBe(ErrorCodes.ERR_COUPON_NOT_APPLICABLE);
    });

    it('applies percentage cap correctly (maxDiscountAmount)', async () => {
      await Coupon.create({
        code: 'BIGDISCOUNT',
        normalizedCode: 'BIGDISCOUNT',
        name: '50% Off capped at 1500',
        discountType: DISCOUNT_TYPE.PERCENTAGE,
        discountValue: 50, // 50%
        maxDiscountAmount: 1500, // Cap at 15.00
        active: true,
        createdBy: superAdminUser._id,
      });

      await setupActiveCheckout(1, 0); // 10000 subtotal. 50% = 5000, capped at 1500.

      const res = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'BIGDISCOUNT' });

      expect(res.status).toBe(200);
      expect(res.body.data.couponDiscountAmount).toBe(1500);
      expect(res.body.data.total).toBe(10000 - 1500 + 500);
    });
  });

  // ==========================================
  // 4. AUTOMATIC PROMOTIONS & STACKING
  // ==========================================
  describe('Automatic Promotions & Stacking Rules', () => {
    it('automatically applies highest discount promotion on checkout creation', async () => {
      // Promotion 1: 5% off
      await Promotion.create({
        name: 'Promo 5%',
        discountType: DISCOUNT_TYPE.PERCENTAGE,
        discountValue: 5,
        active: true,
        createdBy: superAdminUser._id,
      });

      // Promotion 2: 10% off
      await Promotion.create({
        name: 'Promo 10%',
        discountType: DISCOUNT_TYPE.PERCENTAGE,
        discountValue: 10,
        active: true,
        createdBy: superAdminUser._id,
      });

      const session = await setupActiveCheckout(1, 0); // 10000 subtotal

      expect(session.promotion).not.toBeNull();
      expect(session.promotion.name).toBe('Promo 10%');
      expect(session.promotionDiscountAmount).toBe(1000);
      expect(session.discountAmount).toBe(1000);
      expect(session.total).toBe(10000 - 1000 + 500);
    });

    it('stacks coupon with promotion if promotion.stackable is true', async () => {
      await Promotion.create({
        name: 'Auto Promo 10%',
        discountType: DISCOUNT_TYPE.PERCENTAGE,
        discountValue: 10, // 10% = 1000
        stackable: true,
        active: true,
        createdBy: superAdminUser._id,
      });

      await Coupon.create({
        code: 'STACK500',
        normalizedCode: 'STACK500',
        name: 'Fixed 500 off',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 500,
        active: true,
        createdBy: superAdminUser._id,
      });

      await setupActiveCheckout(1, 0);

      const applyRes = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'STACK500' });

      expect(applyRes.status).toBe(200);
      expect(applyRes.body.data.promotionDiscountAmount).toBe(1000);
      expect(applyRes.body.data.couponDiscountAmount).toBe(500);
      expect(applyRes.body.data.discountAmount).toBe(1500);
      expect(applyRes.body.data.total).toBe(10000 - 1500 + 500);
    });

    it('resolves non-stackable conflict by picking greater discount (PROMO-SEC-07)', async () => {
      // Non-stackable promo: 10% of 10000 = 1000
      await Promotion.create({
        name: 'Non Stackable Promo',
        discountType: DISCOUNT_TYPE.PERCENTAGE,
        discountValue: 10,
        stackable: false,
        active: true,
        createdBy: superAdminUser._id,
      });

      // Coupon: 2500 off (greater than 1000)
      await Coupon.create({
        code: 'BIGGER2500',
        normalizedCode: 'BIGGER2500',
        name: 'Save 2500',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 2500,
        active: true,
        createdBy: superAdminUser._id,
      });

      await setupActiveCheckout(1, 0);

      const applyRes = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'BIGGER2500' });

      expect(applyRes.status).toBe(200);
      // Coupon won because 2500 > 1000
      expect(applyRes.body.data.couponDiscountAmount).toBe(2500);
      expect(applyRes.body.data.promotionDiscountAmount).toBe(0);
      expect(applyRes.body.data.promotion).toBeNull();
      expect(applyRes.body.data.discountAmount).toBe(2500);
    });
  });

  // ==========================================
  // 5. COUPON USAGE LIMITS & FIRST ORDER RESTRICTIONS
  // ==========================================
  describe('Usage Limits & Security Restrictions', () => {
    it('enforces global usage limit (PROMO-SEC-04)', async () => {
      const coupon = await Coupon.create({
        code: 'LIMITED2',
        normalizedCode: 'LIMITED2',
        name: 'Limited 2 uses',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 1000,
        usageLimit: 2,
        redemptionCount: 2, // Limit reached
        active: true,
        createdBy: superAdminUser._id,
      });

      await setupActiveCheckout(1, 0);

      const res = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'LIMITED2' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_COUPON_USAGE_LIMIT_REACHED);
    });

    it('enforces per-user limit across completed redemptions (PROMO-SEC-05)', async () => {
      const coupon = await Coupon.create({
        code: 'ONCEPERUSER',
        normalizedCode: 'ONCEPERUSER',
        name: 'One per customer',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 1000,
        perUserLimit: 1,
        active: true,
        createdBy: superAdminUser._id,
      });

      // Simulate a prior redeemed coupon for customerUser
      await CouponRedemption.create({
        couponId: coupon._id,
        userId: customerUser._id,
        orderId: new Types.ObjectId(),
        codeSnapshot: 'ONCEPERUSER',
        discountAmount: 1000,
        status: REDEMPTION_STATUS.REDEEMED,
        redeemedAt: new Date(),
      });

      await setupActiveCheckout(1, 0);

      const res = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'ONCEPERUSER' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_COUPON_USER_LIMIT_REACHED);
    });

    it('enforces first-order-only customer restriction (PROMO-SEC-06)', async () => {
      await Coupon.create({
        code: 'FIRSTBUY',
        normalizedCode: 'FIRSTBUY',
        name: 'First Order Discount',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 1000,
        firstOrderOnly: true,
        active: true,
        createdBy: superAdminUser._id,
      });

      // Create an existing completed order for customerUser
      await Order.create({
        orderNumber: 'ORD-EXISTING-1',
        userId: customerUser._id,
        checkoutSessionId: new Types.ObjectId(),
        status: ORDER_STATUS.COMPLETED,
        paymentStatus: PAYMENT_STATUS.PAID,
        fulfillmentStatus: FULFILLMENT_STATUS.FULFILLED,
        items: [
          {
            productId: testProduct1._id,
            variantId: testVariant1._id,
            productName: 'Flagship Phone',
            productSlug: 'flagship-phone',
            sku: 'PHONE-BLK',
            variantAttributes: [{ name: 'Color', value: 'Black' }],
            quantity: 1,
            unitPrice: 5000,
            lineTotal: 5000,
          },
        ],
        customerSnapshot: {
          userId: customerUser._id,
          firstName: 'Alice',
          lastName: 'Customer',
          email: 'alice@example.com',
        },
        shippingAddress: {
          sourceAddressId: testAddress._id,
          fullName: 'Alice',
          phone: '+923001234567',
          country: 'PK',
          stateProvince: 'Punjab',
          city: 'Lahore',
          addressLine1: 'Street 1',
        },
        billingAddress: {
          sourceAddressId: testAddress._id,
          fullName: 'Alice',
          phone: '+923001234567',
          country: 'PK',
          stateProvince: 'Punjab',
          city: 'Lahore',
          addressLine1: 'Street 1',
        },
        shippingMethod: {
          code: 'STANDARD',
          name: 'Standard Delivery',
          fee: 0,
          currency: 'PKR',
          estimatedMinDays: 1,
          estimatedMaxDays: 3,
        },
        subtotal: 5000,
        couponDiscountAmount: 0,
        promotionDiscountAmount: 0,
        discountAmount: 0,
        shippingFee: 0,
        total: 5000,
        currency: 'PKR',
        statusHistory: [],
        placedAt: new Date(),
      });

      await setupActiveCheckout(1, 0);

      const res = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'FIRSTBUY' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_COUPON_FIRST_ORDER_ONLY);
    });

    it('rejects inactive or temporally invalid coupons (PROMO-SEC-02, PROMO-SEC-03)', async () => {
      await Coupon.create({
        code: 'INACTIVE',
        normalizedCode: 'INACTIVE',
        name: 'Inactive',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 1000,
        active: false,
        createdBy: superAdminUser._id,
      });

      await Coupon.create({
        code: 'EXPIRED',
        normalizedCode: 'EXPIRED',
        name: 'Expired',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 1000,
        endsAt: new Date(Date.now() - 3600000), // 1 hour ago
        active: true,
        createdBy: superAdminUser._id,
      });

      await setupActiveCheckout(1, 0);

      const resInactive = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'INACTIVE' });
      expect(resInactive.status).toBe(400);
      expect(resInactive.body.error.code).toBe(ErrorCodes.ERR_COUPON_INACTIVE);

      const resExpired = await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'EXPIRED' });
      expect(resExpired.status).toBe(400);
      expect(resExpired.body.error.code).toBe(ErrorCodes.ERR_COUPON_EXPIRED);
    });
  });

  // ==========================================
  // 6. ORDER CREATION, REDEMPTION & REVERSAL
  // ==========================================
  describe('Order Creation & Redemption Lifecycle', () => {
    it('records CouponRedemption and increments redemptionCount on order placement', async () => {
      const coupon = await Coupon.create({
        code: 'SAVE1000',
        normalizedCode: 'SAVE1000',
        name: 'Save 1000',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 1000,
        usageLimit: 10,
        active: true,
        createdBy: superAdminUser._id,
      });

      await setupActiveCheckout(1, 0);

      await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'SAVE1000' });

      // Place order
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.success).toBe(true);
      expect(orderRes.body.data.order.couponDiscountAmount).toBe(1000);
      expect(orderRes.body.data.order.discountAmount).toBe(1000);
      expect(orderRes.body.data.order.coupon.code).toBe('SAVE1000');

      // Verify coupon redemption record
      const redemption = await CouponRedemption.findOne({
        orderId: new Types.ObjectId(orderRes.body.data.order.id),
      });
      expect(redemption).not.toBeNull();
      expect(redemption?.status).toBe(REDEMPTION_STATUS.REDEEMED);
      expect(redemption?.discountAmount).toBe(1000);

      // Verify coupon atomic counter increment
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon?.redemptionCount).toBe(1);
    });

    it('reverses CouponRedemption and decrements redemptionCount when customer cancels order', async () => {
      const coupon = await Coupon.create({
        code: 'CANCELME',
        normalizedCode: 'CANCELME',
        name: 'Cancel Me',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 1000,
        usageLimit: 10,
        active: true,
        createdBy: superAdminUser._id,
      });

      await setupActiveCheckout(1, 0);

      await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'CANCELME' });

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      const orderId = orderRes.body.data.order.id;

      // Cancel order
      const cancelRes = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed my mind' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.order.status).toBe(ORDER_STATUS.CANCELLED);

      // Verify redemption is REVERSED
      const redemption = await CouponRedemption.findOne({
        orderId: new Types.ObjectId(orderId),
      });
      expect(redemption?.status).toBe(REDEMPTION_STATUS.REVERSED);
      expect(redemption?.reversedAt).not.toBeNull();

      // Verify coupon counter decremented back to 0
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon?.redemptionCount).toBe(0);
    });

    it('fetches coupon redemption audit trail via admin API', async () => {
      const coupon = await Coupon.create({
        code: 'AUDITME',
        normalizedCode: 'AUDITME',
        name: 'Audit Me',
        discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
        discountValue: 500,
        active: true,
        createdBy: superAdminUser._id,
      });

      await setupActiveCheckout(1, 0);

      await request(app)
        .post('/api/v1/checkout/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'AUDITME' });

      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      const redemptionsRes = await request(app)
        .get(`/api/v1/admin/coupons/${coupon._id.toString()}/redemptions`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(redemptionsRes.status).toBe(200);
      expect(redemptionsRes.body.success).toBe(true);
      expect(redemptionsRes.body.data.length).toBe(1);
      expect(redemptionsRes.body.data[0].codeSnapshot).toBe('AUDITME');
      expect(redemptionsRes.body.data[0].customerEmail).toBe('alice@example.com');
      expect(redemptionsRes.body.data[0].discountAmount).toBe(500);
    });
  });
});
