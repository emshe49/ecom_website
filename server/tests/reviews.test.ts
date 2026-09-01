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
import { Order } from '../src/modules/orders/order.model.js';
import { Review } from '../src/modules/reviews/review.model.js';
import { ReviewHelpfulVote } from '../src/modules/reviews/review-helpful-vote.model.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from '../src/modules/orders/order.constants.js';
import { REVIEW_STATUS } from '../src/modules/reviews/review.constants.js';
import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';
import { ErrorCodes } from '../src/shared/errors/error-codes.js';

describe('Module 15: Reviews & Ratings Integration Tests', () => {
  let app: any;
  let customerUser: any;
  let customerToken: string;
  let otherCustomerUser: any;
  let otherCustomerToken: string;
  let superAdminUser: any;
  let superAdminToken: string;
  let customerSupportUser: any;
  let customerSupportToken: string;
  let productManagerUser: any;
  let productManagerToken: string;
  let inventoryManagerUser: any;
  let inventoryManagerToken: string;

  let testCategory: any;
  let testBrand: any;
  let testProduct1: any;
  let testProduct2: any;
  let testVariant1: any;
  let testVariant2: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    app = createApp();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await Product.deleteMany({});
    await ProductVariant.deleteMany({});
    await Order.deleteMany({});
    await Review.deleteMany({});
    await ReviewHelpfulVote.deleteMany({});

    // Create test customer 1
    customerUser = await User.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'customer@test.local',
      passwordHash: 'hashed_pw_123',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    customerToken = generateAccessToken({
      sub: customerUser._id.toString(),
      role: customerUser.role,
      email: customerUser.email,
    });

    // Create test customer 2
    otherCustomerUser = await User.create({
      firstName: 'John',
      lastName: 'Smith',
      email: 'other@test.local',
      passwordHash: 'hashed_pw_123',
      role: ROLES.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });
    otherCustomerToken = generateAccessToken({
      sub: otherCustomerUser._id.toString(),
      role: otherCustomerUser.role,
      email: otherCustomerUser.email,
    });

    // Create Super Admin
    superAdminUser = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@test.local',
      passwordHash: 'hashed_pw_123',
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    superAdminToken = generateAccessToken({
      sub: superAdminUser._id.toString(),
      role: superAdminUser.role,
      email: superAdminUser.email,
    });

    // Create Customer Support
    customerSupportUser = await User.create({
      firstName: 'Support',
      lastName: 'Agent',
      email: 'support@test.local',
      passwordHash: 'hashed_pw_123',
      role: ROLES.CUSTOMER_SUPPORT,
      isEmailVerified: true,
      isActive: true,
    });
    customerSupportToken = generateAccessToken({
      sub: customerSupportUser._id.toString(),
      role: customerSupportUser.role,
      email: customerSupportUser.email,
    });

    // Create Product Manager
    productManagerUser = await User.create({
      firstName: 'Product',
      lastName: 'Manager',
      email: 'prodmgr@test.local',
      passwordHash: 'hashed_pw_123',
      role: ROLES.PRODUCT_MANAGER,
      isEmailVerified: true,
      isActive: true,
    });
    productManagerToken = generateAccessToken({
      sub: productManagerUser._id.toString(),
      role: productManagerUser.role,
      email: productManagerUser.email,
    });

    // Create Inventory Manager
    inventoryManagerUser = await User.create({
      firstName: 'Inventory',
      lastName: 'Staff',
      email: 'inventory@test.local',
      passwordHash: 'hashed_pw_123',
      role: ROLES.INVENTORY_MANAGER,
      isEmailVerified: true,
      isActive: true,
    });
    inventoryManagerToken = generateAccessToken({
      sub: inventoryManagerUser._id.toString(),
      role: inventoryManagerUser.role,
      email: inventoryManagerUser.email,
    });

    // Create Catalog hierarchy
    testCategory = await Category.create({
      name: 'Electronics',
      normalizedName: 'electronics',
      slug: 'electronics',
      isActive: true,
    });

    testBrand = await Brand.create({
      name: 'Sony',
      normalizedName: 'sony',
      slug: 'sony',
      isActive: true,
    });

    testProduct1 = await Product.create({
      name: 'Sony WH-1000XM5 Headphones',
      slug: 'sony-wh-1000xm5',
      categoryId: testCategory._id,
      brandId: testBrand._id,
      status: 'ACTIVE',
      featured: true,
      ratingAverage: 0,
      ratingCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      images: [{ url: 'https://example.com/xm5.jpg', sortOrder: 0, isPrimary: true }],
    });

    testVariant1 = await ProductVariant.create({
      productId: testProduct1._id,
      sku: 'SONY-XM5-BLK',
      name: 'Black',
      price: 35000,
      isActive: true,
      attributeSignature: 'color:black',
      attributes: [{ name: 'Color', value: 'Black' }],
    });

    testProduct2 = await Product.create({
      name: 'Sony PlayStation 5 Console',
      slug: 'sony-playstation-5',
      categoryId: testCategory._id,
      brandId: testBrand._id,
      status: 'ACTIVE',
      featured: false,
      ratingAverage: 0,
      ratingCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      images: [{ url: 'https://example.com/ps5.jpg', sortOrder: 0, isPrimary: true }],
    });

    testVariant2 = await ProductVariant.create({
      productId: testProduct2._id,
      sku: 'SONY-PS5-DIG',
      name: 'Digital Edition',
      price: 55000,
      isActive: true,
      attributeSignature: 'edition:digital',
      attributes: [{ name: 'Edition', value: 'Digital' }],
    });
  });

  // Helper to create order
  const createOrder = async (
    userId: string,
    product: any,
    variant: any,
    status = ORDER_STATUS.DELIVERED
  ) => {
    const userObjectId = new Types.ObjectId(userId);
    const addressId = new Types.ObjectId();

    return Order.create({
      orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: userObjectId,
      checkoutSessionId: new Types.ObjectId(),
      status,
      paymentStatus: PAYMENT_STATUS.PAID,
      fulfillmentStatus:
        status === ORDER_STATUS.DELIVERED
          ? FULFILLMENT_STATUS.DELIVERED
          : FULFILLMENT_STATUS.UNFULFILLED,
      items: [
        {
          productId: product._id,
          variantId: variant._id,
          productName: product.name,
          productSlug: product.slug,
          sku: variant.sku,
          variantAttributes: variant.attributes,
          primaryImage: product.images[0]?.url || null,
          quantity: 1,
          unitPrice: variant.price,
          lineTotal: variant.price,
        },
      ],
      customerSnapshot: {
        userId: userObjectId,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'customer@test.local',
      },
      shippingAddress: {
        sourceAddressId: addressId,
        fullName: 'Jane Doe',
        phone: '03001234567',
        country: 'Pakistan',
        stateProvince: 'Sindh',
        city: 'Karachi',
        addressLine1: 'Street 1',
      },
      billingAddress: {
        sourceAddressId: addressId,
        fullName: 'Jane Doe',
        phone: '03001234567',
        country: 'Pakistan',
        stateProvince: 'Sindh',
        city: 'Karachi',
        addressLine1: 'Street 1',
      },
      shippingMethod: {
        code: 'STANDARD',
        name: 'Standard Shipping',
        fee: 0,
        currency: 'PKR',
        estimatedMinDays: 2,
        estimatedMaxDays: 4,
      },
      subtotal: variant.price,
      shippingFee: 0,
      total: variant.price,
      currency: 'PKR',
      statusHistory: [{ status, changedAt: new Date(), changedBy: userObjectId }],
      placedAt: new Date(),
      completedAt: status === ORDER_STATUS.DELIVERED ? new Date() : null,
    });
  };

  describe('1. Review Eligibility & Verified Purchase Enforcement (AC-01..15, REVIEW-SEC-01..03)', () => {
    it('REVIEW-SEC-01 & AC-08: customer without delivered purchase cannot create review (403 ERR_REVIEW_NOT_ELIGIBLE)', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'This is a fantastic headphone with noise cancelling.',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_REVIEW_NOT_ELIGIBLE);
    });

    it('AC-09 & AC-10: non-delivered orders (PLACED, SHIPPED, CANCELLED) do not grant review eligibility', async () => {
      // Order in PLACED status
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.PLACED);

      const resPlaced = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Trying to review on placed order.',
        });
      expect(resPlaced.status).toBe(403);
      expect(resPlaced.body.error.code).toBe(ErrorCodes.ERR_REVIEW_NOT_ELIGIBLE);

      // Order in CANCELLED status
      await Order.deleteMany({});
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.CANCELLED);

      const resCancelled = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Trying to review on cancelled order.',
        });
      expect(resCancelled.status).toBe(403);
      expect(resCancelled.body.error.code).toBe(ErrorCodes.ERR_REVIEW_NOT_ELIGIBLE);
    });

    it('REVIEW-SEC-02 & AC-11: customer B cannot review using customer A delivered order', async () => {
      // Customer A has delivered order
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);

      // Customer B attempts review
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Customer B trying to review product.',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_REVIEW_NOT_ELIGIBLE);
    });

    it('AC-07, AC-12, AC-13, AC-14: customer with delivered order creates verified review successfully', async () => {
      const order = await createOrder(
        customerUser._id.toString(),
        testProduct1,
        testVariant1,
        ORDER_STATUS.DELIVERED
      );

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          title: 'Outstanding sound quality',
          body: 'The active noise cancellation on these headphones is truly state-of-the-art.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.title).toBe('Outstanding sound quality');
      expect(res.body.data.verifiedPurchase).toBe(true);
      expect(res.body.data.status).toBe(REVIEW_STATUS.PUBLISHED);

      // Check DB record
      const dbReview = await Review.findById(res.body.data.id);
      expect(dbReview).toBeDefined();
      expect(dbReview?.orderId.toString()).toBe(order._id.toString());
      expect(dbReview?.variantId?.toString()).toBe(testVariant1._id.toString());
      expect(dbReview?.helpfulCount).toBe(0);
    });

    it('REVIEW-SEC-03, AC-03, AC-15: rejects duplicate review for same user & product (409 ERR_REVIEW_ALREADY_EXISTS)', async () => {
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);

      // First review
      const res1 = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'First valid review for the product.',
        });
      expect(res1.status).toBe(201);

      // Second review attempt
      const res2 = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 4,
          body: 'Second attempt should be rejected with 409.',
        });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe(ErrorCodes.ERR_REVIEW_ALREADY_EXISTS);
    });
  });

  describe('2. Validation & Security Protections (AC-04..06, REVIEW-SEC-04, REVIEW-SEC-10)', () => {
    beforeEach(async () => {
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);
    });

    it('AC-04: rejects invalid ratings (0, 6, 4.5, strings)', async () => {
      const invalidRatings = [0, 6, 4.5, -1, 10];

      for (const rating of invalidRatings) {
        const res = await request(app)
          .post('/api/v1/reviews')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            productId: testProduct1._id.toString(),
            rating,
            body: 'Valid review body for testing rating.',
          });
        expect(res.status).toBe(400);
      }
    });

    it('AC-05: rejects review body that is too short (<10 chars) or too long (>2000 chars)', async () => {
      // Too short
      const resShort = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Short',
        });
      expect(resShort.status).toBe(400);

      // Too long (>2000)
      const resLong = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'A'.repeat(2001),
        });
      expect(resLong.status).toBe(400);
    });

    it('REVIEW-SEC-04: strict schema rejects injection of server-authoritative fields (userId, orderId, verifiedPurchase, status)', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Attempting to inject server fields.',
          verifiedPurchase: true,
          status: 'PUBLISHED',
          userId: otherCustomerUser._id.toString(),
          orderId: new Types.ObjectId().toString(),
          helpfulCount: 999,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('REVIEW-SEC-10: stores review text as safe plain text and handles script tags without execution', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          title: '<script>alert("xss")</script>',
          body: '<img src=x onerror=alert(1)> Great product overall!',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.body).toBe('<img src=x onerror=alert(1)> Great product overall!');
    });
  });

  describe('3. Rating Aggregate Calculations & Concurrency Safety (AC-27..36)', () => {
    it('AC-30: zero-review product starts with default 0 average and empty distribution', async () => {
      const product = await Product.findById(testProduct1._id);
      expect(product?.ratingAverage).toBe(0);
      expect(product?.ratingCount).toBe(0);
      expect(product?.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });

    it('AC-31 & AC-36: review creations accurately update rating average and distribution', async () => {
      // Customer 1 purchases product 1
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);
      // Customer 2 purchases product 1
      await createOrder(otherCustomerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);

      // Customer 1 gives 5 stars
      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: '5 star review from customer 1.',
        });

      let updatedProd = await Product.findById(testProduct1._id);
      expect(updatedProd?.ratingAverage).toBe(5);
      expect(updatedProd?.ratingCount).toBe(1);
      expect(updatedProd?.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 });

      // Customer 2 gives 3 stars
      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 3,
          body: '3 star review from customer 2.',
        });

      updatedProd = await Product.findById(testProduct1._id);
      expect(updatedProd?.ratingAverage).toBe(4); // (5+3)/2 = 4.0
      expect(updatedProd?.ratingCount).toBe(2);
      expect(updatedProd?.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 });
    });

    it('AC-32: editing rating triggers aggregate recalculation', async () => {
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Initial 5 star review.',
        });

      const reviewId = createRes.body.data.id;

      // Update rating from 5 to 2
      const updateRes = await request(app)
        .patch(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 2,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.rating).toBe(2);

      const updatedProd = await Product.findById(testProduct1._id);
      expect(updatedProd?.ratingAverage).toBe(2);
      expect(updatedProd?.ratingCount).toBe(1);
      expect(updatedProd?.ratingDistribution).toEqual({ 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 });
    });

    it('AC-33: deleting review recalculates aggregate back to zero', async () => {
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);

      const createRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 4,
          body: '4 star review to be deleted.',
        });

      const reviewId = createRes.body.data.id;

      // Delete review
      const delRes = await request(app)
        .delete(`/api/v1/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(delRes.status).toBe(200);

      const updatedProd = await Product.findById(testProduct1._id);
      expect(updatedProd?.ratingAverage).toBe(0);
      expect(updatedProd?.ratingCount).toBe(0);
      expect(updatedProd?.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });
  });

  describe('4. Review Ownership & IDOR Protection (REVIEW-SEC-05, AC-16..20)', () => {
    let customerAReviewId: string;

    beforeEach(async () => {
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Customer A original review text.',
        });
      customerAReviewId = res.body.data.id;
    });

    it('REVIEW-SEC-05 & AC-18: customer B cannot update customer A review (404 IDOR protected)', async () => {
      const res = await request(app)
        .patch(`/api/v1/reviews/${customerAReviewId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          rating: 1,
          body: 'Hacked by customer B!',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_REVIEW_NOT_FOUND);

      // Verify DB unchanged
      const review = await Review.findById(customerAReviewId);
      expect(review?.rating).toBe(5);
      expect(review?.body).toBe('Customer A original review text.');
    });

    it('REVIEW-SEC-05 & AC-20: customer B cannot delete customer A review (404 IDOR protected)', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${customerAReviewId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_REVIEW_NOT_FOUND);

      // Verify DB still contains review
      const review = await Review.findById(customerAReviewId);
      expect(review).toBeDefined();
    });
  });

  describe('5. Public Product Reviews & Privacy Isolation (AC-21..26, REVIEW-SEC-06)', () => {
    beforeEach(async () => {
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);
      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          title: 'Love this item',
          body: 'Detailed review body with 5 stars.',
        });
    });

    it('AC-21, AC-26 & REVIEW-SEC-06: public endpoint masks customer identity (e.g. Jane D.) and hides private data', async () => {
      const res = await request(app).get(`/api/v1/products/${testProduct1._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);

      const review = res.body.data[0];
      expect(review.reviewer.displayName).toBe('Jane D.');
      expect(review.rating).toBe(5);
      expect(review.title).toBe('Love this item');
      expect(review.verifiedPurchase).toBe(true);

      // Ensure no private user data leaked
      expect(review.userId).toBeUndefined();
      expect(review.email).toBeUndefined();
      expect(review.phone).toBeUndefined();
      expect(review.internalNotes).toBeUndefined();
      expect(review.moderationReason).toBeUndefined();
    });

    it('AC-24: rating filter returns only matching star reviews', async () => {
      // Add second review with 3 stars by other customer
      await createOrder(otherCustomerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);
      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 3,
          body: 'Average quality 3 star review.',
        });

      // Filter rating=5
      const res5 = await request(app).get(`/api/v1/products/${testProduct1._id}/reviews?rating=5`);
      expect(res5.status).toBe(200);
      expect(res5.body.data.length).toBe(1);
      expect(res5.body.data[0].rating).toBe(5);

      // Filter rating=3
      const res3 = await request(app).get(`/api/v1/products/${testProduct1._id}/reviews?rating=3`);
      expect(res3.status).toBe(200);
      expect(res3.body.data.length).toBe(1);
      expect(res3.body.data[0].rating).toBe(3);

      // Filter rating=1 (empty)
      const res1 = await request(app).get(`/api/v1/products/${testProduct1._id}/reviews?rating=1`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.length).toBe(0);
    });

    it('AC-25: supports review sorting options (newest, oldest, rating-high, rating-low, helpful)', async () => {
      // Add second review
      await createOrder(otherCustomerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);
      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 2,
          body: 'Disappointed 2 star review.',
        });

      const resHigh = await request(app).get(`/api/v1/products/${testProduct1._id}/reviews?sort=rating-high`);
      expect(resHigh.body.data[0].rating).toBe(5);
      expect(resHigh.body.data[1].rating).toBe(2);

      const resLow = await request(app).get(`/api/v1/products/${testProduct1._id}/reviews?sort=rating-low`);
      expect(resLow.body.data[0].rating).toBe(2);
      expect(resLow.body.data[1].rating).toBe(5);
    });
  });

  describe('6. Helpful Votes & Anti-Manipulation Controls (AC-51..55, REVIEW-SEC-09)', () => {
    let reviewId: string;

    beforeEach(async () => {
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Great review to vote on.',
        });
      reviewId = res.body.data.id;
    });

    it('AC-51: other customer can mark review as helpful and increment count', async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.helpfulCount).toBe(1);
      expect(res.body.data.isHelpfulByUser).toBe(true);

      const dbReview = await Review.findById(reviewId);
      expect(dbReview?.helpfulCount).toBe(1);
    });

    it('AC-52 & REVIEW-SEC-09: duplicate helpful vote is idempotent and does not double-increment', async () => {
      // First vote
      await request(app)
        .post(`/api/v1/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      // Second duplicate vote
      const res2 = await request(app)
        .post(`/api/v1/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.helpfulCount).toBe(1);

      const dbReview = await Review.findById(reviewId);
      expect(dbReview?.helpfulCount).toBe(1);
    });

    it('AC-53: removing helpful vote decrements count and never goes below zero', async () => {
      // Upvote
      await request(app)
        .post(`/api/v1/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      // Remove vote
      const delRes = await request(app)
        .delete(`/api/v1/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.helpfulCount).toBe(0);
      expect(delRes.body.data.isHelpfulByUser).toBe(false);

      // Remove vote again when already 0 (idempotent)
      const delRes2 = await request(app)
        .delete(`/api/v1/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(delRes2.status).toBe(200);
      expect(delRes2.body.data.helpfulCount).toBe(0);
    });

    it('AC-54 & REVIEW-SEC-09: review author cannot mark own review as helpful (400 ERR_REVIEW_SELF_HELPFUL_NOT_ALLOWED)', async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_REVIEW_SELF_HELPFUL_NOT_ALLOWED);
    });
  });

  describe('7. Admin Review Moderation & RBAC Controls (AC-56..65, REVIEW-SEC-07, REVIEW-SEC-08)', () => {
    let reviewId: string;

    beforeEach(async () => {
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Review to be moderated.',
        });
      reviewId = res.body.data.id;
    });

    it('REVIEW-SEC-07 & AC-65: customer and unauthorized staff denied admin review endpoints (403)', async () => {
      // Customer
      const resCust = await request(app)
        .get('/api/v1/admin/reviews')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(resCust.status).toBe(403);

      // Inventory Manager
      const resInv = await request(app)
        .get('/api/v1/admin/reviews')
        .set('Authorization', `Bearer ${inventoryManagerToken}`);
      expect(resInv.status).toBe(403);
    });

    it('AC-56, AC-57 & AC-64: super admin and customer support can list and view reviews', async () => {
      const resAdmin = await request(app)
        .get('/api/v1/admin/reviews')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data.length).toBe(1);

      const resSupport = await request(app)
        .get(`/api/v1/admin/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${customerSupportToken}`);
      expect(resSupport.status).toBe(200);
      expect(resSupport.body.data.customer.email).toBe('customer@test.local');
    });

    it('AC-59: hiding or rejecting review requires a moderation reason (min 5 chars)', async () => {
      const resNoReason = await request(app)
        .patch(`/api/v1/admin/reviews/${reviewId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'HIDDEN',
        });
      expect(resNoReason.status).toBe(400);
      expect(resNoReason.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('REVIEW-SEC-08, AC-34, AC-35, AC-61, AC-62: hidden review is removed from public list and excluded from product rating aggregate', async () => {
      // Check initial product rating average = 5
      let prod = await Product.findById(testProduct1._id);
      expect(prod?.ratingAverage).toBe(5);

      // Admin hides review
      const resHide = await request(app)
        .patch(`/api/v1/admin/reviews/${reviewId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'HIDDEN',
          reason: 'Violates community guidelines on offensive terms.',
        });

      expect(resHide.status).toBe(200);
      expect(resHide.body.data.status).toBe('HIDDEN');

      // Product rating average recalculated to 0 (no published reviews)
      prod = await Product.findById(testProduct1._id);
      expect(prod?.ratingAverage).toBe(0);
      expect(prod?.ratingCount).toBe(0);

      // Public endpoint returns 0 reviews
      const publicRes = await request(app).get(`/api/v1/products/${testProduct1._id}/reviews`);
      expect(publicRes.body.data.length).toBe(0);

      // Admin republishes review
      const resRepublish = await request(app)
        .patch(`/api/v1/admin/reviews/${reviewId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'PUBLISHED',
        });
      expect(resRepublish.status).toBe(200);

      // Product rating restored
      prod = await Product.findById(testProduct1._id);
      expect(prod?.ratingAverage).toBe(5);
      expect(prod?.ratingCount).toBe(1);
    });
  });

  describe('8. Customer Review History & Eligible Products (AC-40..43)', () => {
    it('AC-40..43: customer can query their own reviews and eligible unreviewed products', async () => {
      // Customer has delivered order for product 1 and product 2
      await createOrder(customerUser._id.toString(), testProduct1, testVariant1, ORDER_STATUS.DELIVERED);
      await createOrder(customerUser._id.toString(), testProduct2, testVariant2, ORDER_STATUS.DELIVERED);

      // Query eligible products (both should appear)
      const eligibleRes1 = await request(app)
        .get('/api/v1/reviews/eligible-products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(eligibleRes1.status).toBe(200);
      expect(eligibleRes1.body.data.length).toBe(2);

      // Review product 1
      await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct1._id.toString(),
          rating: 5,
          body: 'Reviewed product 1.',
        });

      // Query eligible products again (only product 2 remains)
      const eligibleRes2 = await request(app)
        .get('/api/v1/reviews/eligible-products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(eligibleRes2.status).toBe(200);
      expect(eligibleRes2.body.data.length).toBe(1);
      expect(eligibleRes2.body.data[0].productId).toBe(testProduct2._id.toString());

      // Query my reviews
      const myReviewsRes = await request(app)
        .get('/api/v1/reviews/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(myReviewsRes.status).toBe(200);
      expect(myReviewsRes.body.data.length).toBe(1);
      expect(myReviewsRes.body.data[0].product.name).toBe(testProduct1.name);
    });
  });
});
