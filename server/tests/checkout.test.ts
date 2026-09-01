import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { Address } from '../src/modules/addresses/address.model.js';
import { Category } from '../src/modules/catalog/categories/category.model.js';
import { Brand } from '../src/modules/catalog/brands/brand.model.js';
import { Product } from '../src/modules/catalog/products/product.model.js';
import { ProductVariant } from '../src/modules/catalog/products/product-variant.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { InventoryTransaction } from '../src/modules/inventory/inventory-transaction.model.js';
import { Cart } from '../src/modules/cart/cart.model.js';
import { CheckoutSession } from '../src/modules/checkout/checkout.model.js';
import { CHECKOUT_STATUS } from '../src/modules/checkout/checkout.constants.js';
import { REFERENCE_TYPE, TRANSACTION_TYPE } from '../src/modules/inventory/inventory.constants.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import { generateAccessToken } from '../src/modules/auth/auth-token.service.js';
import { ErrorCodes } from '../src/shared/errors/error-codes.js';


describe('Module 11 — Checkout Integration & Security Tests', () => {
  let app: any;
  let customerUserA: any;
  let customerUserB: any;
  let tokenA: string;
  let tokenB: string;

  let shippingAddressA: any;
  let billingAddressA: any;
  let addressB: any;

  let category: any;
  let brand: any;
  let productA: any;
  let variantA1: any;
  let variantA2: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
  });

  beforeEach(async () => {
    app = createApp();

    // Clean up collections
    await Promise.all([
      User.deleteMany({}),
      Address.deleteMany({}),
      Category.deleteMany({}),

      Brand.deleteMany({}),
      Product.deleteMany({}),
      ProductVariant.deleteMany({}),
      Inventory.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      Cart.deleteMany({}),
      CheckoutSession.deleteMany({}),
    ]);

    // Create & Login Customer A
    const regA = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Alice',
      lastName: 'Customer',
      email: 'alice@checkout.test',
      password: 'Password123!',
    });
    customerUserA = await User.findById(regA.body.data.user.id);
    await User.findByIdAndUpdate(customerUserA._id, { isEmailVerified: true });
    const loginA = await request(app).post('/api/v1/auth/login').send({
      email: 'alice@checkout.test',
      password: 'Password123!',
    });
    tokenA = loginA.body.data.accessToken;

    // Create & Login Customer B
    const regB = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Bob',
      lastName: 'Customer',
      email: 'bob@checkout.test',
      password: 'Password123!',
    });
    customerUserB = await User.findById(regB.body.data.user.id);
    await User.findByIdAndUpdate(customerUserB._id, { isEmailVerified: true });
    const loginB = await request(app).post('/api/v1/auth/login').send({
      email: 'bob@checkout.test',
      password: 'Password123!',
    });
    tokenB = loginB.body.data.accessToken;


    // Create Addresses
    shippingAddressA = await Address.create({
      userId: customerUserA._id,
      fullName: 'Alice Receiver',
      phone: '+923001112233',
      country: 'PK',
      stateProvince: 'Punjab',
      city: 'Lahore',
      addressLine1: 'House 1, Street 2',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    billingAddressA = await Address.create({
      userId: customerUserA._id,
      fullName: 'Alice Billing',
      phone: '+923001112233',
      country: 'PK',
      stateProvince: 'Punjab',
      city: 'Lahore',
      addressLine1: 'Office 10, Plaza 5',
      isDefaultShipping: false,
      isDefaultBilling: false,
    });

    addressB = await Address.create({
      userId: customerUserB._id,
      fullName: 'Bob Receiver',
      phone: '+923009998877',
      country: 'PK',
      stateProvince: 'Sindh',
      city: 'Karachi',
      addressLine1: 'Flat 4B, Tower 1',
      isDefaultShipping: true,
      isDefaultBilling: true,
    });

    // Create Category & Brand
    category = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      isActive: true,
    });

    brand = await Brand.create({
      name: 'TechBrand',
      normalizedName: 'techbrand',
      slug: 'techbrand',
      isActive: true,
    });


    // Create Product & Variants
    productA = await Product.create({
      name: 'Smart Device Pro',
      slug: 'smart-device-pro',
      categoryId: category._id,
      brandId: brand._id,
      status: 'ACTIVE',
      images: [{ url: 'https://images.local/p1.jpg', isPrimary: true, sortOrder: 0 }],
      attributes: [],
      tags: [],
    });

    variantA1 = await ProductVariant.create({
      productId: productA._id,
      sku: 'DEV-BLK-128',
      name: 'Black 128GB',
      attributes: [{ name: 'Color', value: 'Black' }],
      attributeSignature: 'color:black',
      price: 500000, // 5,000.00 PKR
      costPrice: 350000,
      isActive: true,
    });

    variantA2 = await ProductVariant.create({
      productId: productA._id,
      sku: 'DEV-SLV-256',
      name: 'Silver 256GB',
      attributes: [{ name: 'Color', value: 'Silver' }],
      attributeSignature: 'color:silver',
      price: 800000, // 8,000.00 PKR
      costPrice: 550000,
      isActive: true,
    });

    // Initialize Inventory: Variant A1 (10 on-hand), Variant A2 (5 on-hand)
    await Inventory.create({
      variantId: variantA1._id,
      onHand: 10,
      reserved: 0,
      lowStockThreshold: 2,
    });

    await Inventory.create({
      variantId: variantA2._id,
      onHand: 5,
      reserved: 0,
      lowStockThreshold: 2,
    });
  });

  describe('1. Cart & Address Validation during Checkout Creation', () => {
    it('should reject checkout if customer cart is empty with 409 ERR_CHECKOUT_EMPTY_CART', async () => {
      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_CHECKOUT_EMPTY_CART);
    });

    it('should reject checkout if shippingAddress does not belong to the customer (CHECKOUT-SEC-02)', async () => {
      // Setup cart with 1 item
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 2, addedPrice: 500000 }],
        subtotal: 1000000,
        currency: 'PKR',
      });

      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: addressB._id.toString(), // Bob's address
          billingSameAsShipping: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_CHECKOUT_INVALID_ADDRESS);
    });

    it('should reject checkout if billingAddress is missing when billingSameAsShipping is false', async () => {
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 1, addedPrice: 500000 }],
        subtotal: 500000,
        currency: 'PKR',
      });

      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: false,
        });

      expect(res.status).toBe(400);
    });

    it('should reject body tampering attempting to override price, subtotal or userId (CHECKOUT-SEC-04)', async () => {
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 1, addedPrice: 500000 }],
        subtotal: 500000,
        currency: 'PKR',
      });

      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: true,
          subtotal: 100, // Tampering attempt
          userId: customerUserB._id.toString(),
          items: [],
        });

      expect(res.status).toBe(400); // Strict Zod rejects unknown fields
    });
  });

  describe('2. Successful Checkout Creation, Snapshots & Inventory Reservation', () => {
    it('should create an ACTIVE Checkout session, snapshot addresses/prices, and reserve stock (CHECKOUT-SEC-05)', async () => {
      // Cart: 2 units of Variant A1 (500000 each) + 1 unit of Variant A2 (800000 each)
      await Cart.create({
        userId: customerUserA._id,
        items: [
          { variantId: variantA1._id, quantity: 2, addedPrice: 400000 }, // Stale cart price
          { variantId: variantA2._id, quantity: 1, addedPrice: 700000 },
        ],
        subtotal: 1500000,
        currency: 'PKR',
      });

      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: false,
          billingAddressId: billingAddressA._id.toString(),
        });

      expect(res.status).toBe(201);
      const checkout = res.body.data;
      expect(checkout.status).toBe(CHECKOUT_STATUS.ACTIVE);
      expect(checkout.items.length).toBe(2);

      // Verify authoritative live prices used instead of cart prices
      expect(checkout.items[0].unitPrice).toBe(500000);
      expect(checkout.items[0].lineTotal).toBe(1000000);
      expect(checkout.items[1].unitPrice).toBe(800000);
      expect(checkout.items[1].lineTotal).toBe(800000);
      expect(checkout.subtotal).toBe(1800000); // 1,800,000 minor units
      expect(checkout.currency).toBe('PKR');

      // Verify Address snapshots
      expect(checkout.shippingAddress.fullName).toBe('Alice Receiver');
      expect(checkout.billingAddress.fullName).toBe('Alice Billing');

      // Verify Inventory was reserved without reducing onHand
      const invA1 = await Inventory.findOne({ variantId: variantA1._id });
      expect(invA1?.onHand).toBe(10);
      expect(invA1?.reserved).toBe(2);

      const invA2 = await Inventory.findOne({ variantId: variantA2._id });
      expect(invA2?.onHand).toBe(5);
      expect(invA2?.reserved).toBe(1);

      // Verify InventoryTransaction created with referenceType CHECKOUT
      const tx = await InventoryTransaction.find({
        type: TRANSACTION_TYPE.RESERVATION,
        referenceType: REFERENCE_TYPE.CHECKOUT,
        referenceId: checkout.id,
      });
      expect(tx.length).toBe(2);

      // Verify DTO does not expose sensitive internals (CHECKOUT-SEC-09)
      expect(checkout.items[0].costPrice).toBeUndefined();
      expect(checkout.onHand).toBeUndefined();
      expect(checkout.reserved).toBeUndefined();
    });

    it('should rollback all previous reservations if a later item in the cart fails stock check (CHECKOUT-SEC-07)', async () => {
      // Cart: 2 units of Variant A1 (stock: 10) + 10 units of Variant A2 (stock: only 5 available!)
      await Cart.create({
        userId: customerUserA._id,
        items: [
          { variantId: variantA1._id, quantity: 2, addedPrice: 500000 },
          { variantId: variantA2._id, quantity: 10, addedPrice: 800000 },
        ],
        subtotal: 9000000,
        currency: 'PKR',
      });

      const res = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_CHECKOUT_INSUFFICIENT_STOCK);

      // Verify Variant A1 was NOT left partially reserved!
      const invA1 = await Inventory.findOne({ variantId: variantA1._id });
      expect(invA1?.reserved).toBe(0);

      const invA2 = await Inventory.findOne({ variantId: variantA2._id });
      expect(invA2?.reserved).toBe(0);

      // No active checkout session created
      const activeSession = await CheckoutSession.findOne({ userId: customerUserA._id });
      expect(activeSession).toBeNull();
    });
  });

  describe('3. Active Session Retrieval, Expiration & Cancellation', () => {
    it('should retrieve active checkout and calculate remainingSeconds', async () => {
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 1, addedPrice: 500000 }],
        subtotal: 500000,
        currency: 'PKR',
      });

      await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: true,
        });

      const getRes = await request(app)
        .get('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.status).toBe(CHECKOUT_STATUS.ACTIVE);
      expect(getRes.body.data.remainingSeconds).toBeGreaterThan(800);
    });

    it('should cancel checkout and release reserved stock safely (CHECKOUT-SEC-08)', async () => {
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 3, addedPrice: 500000 }],
        subtotal: 1500000,
        currency: 'PKR',
      });

      const createRes = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: true,
        });

      expect(createRes.status).toBe(201);
      const checkoutId = createRes.body.data.id;

      // Verify reserved = 3
      let inv = await Inventory.findOne({ variantId: variantA1._id });
      expect(inv?.reserved).toBe(3);

      // Cancel checkout
      const cancelRes = await request(app)
        .delete('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(cancelRes.status).toBe(200);

      // Verify reserved is 0
      inv = await Inventory.findOne({ variantId: variantA1._id });
      expect(inv?.reserved).toBe(0);

      // Verify session is CANCELLED and inventoryReserved is false
      const session = await CheckoutSession.findById(checkoutId);
      expect(session?.status).toBe(CHECKOUT_STATUS.CANCELLED);
      expect(session?.inventoryReserved).toBe(false);

      // Double cancel must not release stock twice (CHECKOUT-SEC-08)
      const cancelRes2 = await request(app)
        .delete('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(cancelRes2.status).toBe(200);

      inv = await Inventory.findOne({ variantId: variantA1._id });
      expect(inv?.reserved).toBe(0); // Still 0
    });

    it('should handle expiration, release stock, and return 410 ERR_CHECKOUT_EXPIRED (CHECKOUT-SEC-10)', async () => {
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 2, addedPrice: 500000 }],
        subtotal: 1000000,
        currency: 'PKR',
      });

      const createRes = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: true,
        });

      const checkoutId = createRes.body.data.id;

      // Manually set expiresAt in the past to simulate expiration
      await CheckoutSession.findByIdAndUpdate(checkoutId, {
        expiresAt: new Date(Date.now() - 10000), // 10s ago
      });

      // GET /checkout should detect expiry, release stock, and return 410
      const getRes = await request(app)
        .get('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(getRes.status).toBe(410);
      expect(getRes.body.error.code).toBe(ErrorCodes.ERR_CHECKOUT_EXPIRED);

      // Verify stock released
      const inv = await Inventory.findOne({ variantId: variantA1._id });
      expect(inv?.reserved).toBe(0);

      // Verify session status updated to EXPIRED
      const session = await CheckoutSession.findById(checkoutId);
      expect(session?.status).toBe(CHECKOUT_STATUS.EXPIRED);
      expect(session?.inventoryReserved).toBe(false);
    });
  });

  describe('4. Revalidation, Live Price Changes & Catalog Invalidation', () => {
    it('should detect price change during revalidation and update subtotal with hasPriceChanges flag', async () => {
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 2, addedPrice: 500000 }],
        subtotal: 1000000,
        currency: 'PKR',
      });

      const createRes = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: true,
        });

      expect(createRes.body.data.subtotal).toBe(1000000);

      // Admin updates variant price from 5,000 to 6,000 PKR
      await ProductVariant.findByIdAndUpdate(variantA1._id, { price: 600000 });

      // Customer triggers revalidate
      const revalRes = await request(app)
        .post('/api/v1/checkout/revalidate')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(revalRes.status).toBe(200);
      expect(revalRes.body.data.hasPriceChanges).toBe(true);
      expect(revalRes.body.data.items[0].unitPrice).toBe(600000);
      expect(revalRes.body.data.items[0].lineTotal).toBe(1200000);
      expect(revalRes.body.data.subtotal).toBe(1200000);

      // Verify stock reservation was NOT duplicated
      const inv = await Inventory.findOne({ variantId: variantA1._id });
      expect(inv?.reserved).toBe(2);
    });

    it('should invalidate checkout and release stock if a product is deactivated during checkout', async () => {
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 2, addedPrice: 500000 }],
        subtotal: 1000000,
        currency: 'PKR',
      });

      const createRes = await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: true,
        });

      const checkoutId = createRes.body.data.id;

      // Admin archives or deactivates the product
      await Product.findByIdAndUpdate(productA._id, { status: 'DRAFT' });

      // Customer triggers revalidate
      const revalRes = await request(app)
        .post('/api/v1/checkout/revalidate')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(revalRes.status).toBe(400);
      expect(revalRes.body.error.code).toBe(ErrorCodes.ERR_CHECKOUT_ITEM_UNAVAILABLE);

      // Verify stock released
      const inv = await Inventory.findOne({ variantId: variantA1._id });
      expect(inv?.reserved).toBe(0);

      // Verify status is INVALIDATED
      const session = await CheckoutSession.findById(checkoutId);
      expect(session?.status).toBe(CHECKOUT_STATUS.INVALIDATED);
      expect(session?.inventoryReserved).toBe(false);
    });
  });

  describe('5. Concurrency & Security Rules (CHECKOUT-SEC-01..10)', () => {
    it('CHECKOUT-SEC-01: Unauthenticated request to checkout endpoints should return 401', async () => {
      const res = await request(app).get('/api/v1/checkout');
      expect(res.status).toBe(401);
    });

    it('CHECKOUT-SEC-03: Customer A cannot access Customer B checkout session', async () => {
      // Create session for User A
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 1, addedPrice: 500000 }],
        subtotal: 500000,
        currency: 'PKR',
      });

      await request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          shippingAddressId: shippingAddressA._id.toString(),
          billingSameAsShipping: true,
        });

      // User B tries to GET checkout (should find nothing for User B)
      const resB = await request(app)
        .get('/api/v1/checkout')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resB.status).toBe(404);
      expect(resB.body.error.code).toBe(ErrorCodes.ERR_CHECKOUT_NOT_FOUND);
    });

    it('CHECKOUT-SEC-06: Concurrent checkouts cannot oversell available stock', async () => {
      // Set on-hand to 5
      await Inventory.findOneAndUpdate(
        { variantId: variantA1._id },
        { $set: { onHand: 5, reserved: 0 } }
      );

      // User A wants 4
      await Cart.create({
        userId: customerUserA._id,
        items: [{ variantId: variantA1._id, quantity: 4, addedPrice: 500000 }],
        subtotal: 2000000,
        currency: 'PKR',
      });

      // User B wants 4
      await Cart.create({
        userId: customerUserB._id,
        items: [{ variantId: variantA1._id, quantity: 4, addedPrice: 500000 }],
        subtotal: 2000000,
        currency: 'PKR',
      });

      // Fire concurrent requests
      const [resA, resB] = await Promise.all([
        request(app)
          .post('/api/v1/checkout')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            shippingAddressId: shippingAddressA._id.toString(),
            billingSameAsShipping: true,
          }),
        request(app)
          .post('/api/v1/checkout')
          .set('Authorization', `Bearer ${tokenB}`)
          .send({
            shippingAddressId: addressB._id.toString(),
            billingSameAsShipping: true,
          }),
      ]);

      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(400); // Only one could reserve 4 units from 5 total

      const inv = await Inventory.findOne({ variantId: variantA1._id });
      expect(inv?.reserved).toBe(4);
      expect(inv?.onHand).toBe(5);
    });
  });
});
