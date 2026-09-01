import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { Category } from '../src/modules/catalog/categories/category.model.js';
import { Brand } from '../src/modules/catalog/brands/brand.model.js';
import { Product } from '../src/modules/catalog/products/product.model.js';
import { ProductVariant } from '../src/modules/catalog/products/product-variant.model.js';
import { Cart } from '../src/modules/cart/cart.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { InventoryTransaction } from '../src/modules/inventory/inventory-transaction.model.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import { PRODUCT_STATUS } from '../src/modules/catalog/products/product.constants.js';

const app = createApp();

describe('Module 08: Shopping Cart Management Test Suite', () => {
  let customerAToken: string;
  let customerAId: string;
  let customerBToken: string;
  let customerBId: string;
  let adminToken: string;
  let productManagerToken: string;

  let activeCategoryId: string;
  let inactiveCategoryId: string;
  let activeBrandId: string;
  let inactiveBrandId: string;

  let activeProductId: string;
  let draftProductId: string;
  let inactiveProductId: string;
  let archivedProductId: string;

  let activeVariant1Id: string;
  let activeVariant2Id: string;
  let inactiveVariantId: string;
  let prodInactiveCatVariantId: string;
  let prodInactiveBrandVariantId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    // Clean test data
    await Cart.deleteMany({});
    await InventoryTransaction.deleteMany({});
    await Inventory.deleteMany({});
    await ProductVariant.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});

    await User.deleteMany({
      email: {
        $in: [
          'cart.customer.a@test.com',
          'cart.customer.b@test.com',
          'cart.admin@test.com',
          'cart.pm@test.com',
        ],
      },
    });

    // 1. Setup Customer A
    const regA = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Customer',
      lastName: 'A',
      email: 'cart.customer.a@test.com',
      password: 'Password123!',
    });
    customerAId = regA.body.data.user.id;
    await User.findByIdAndUpdate(customerAId, { isEmailVerified: true });
    const loginA = await request(app).post('/api/v1/auth/login').send({
      email: 'cart.customer.a@test.com',
      password: 'Password123!',
    });
    customerAToken = loginA.body.data.accessToken;

    // 2. Setup Customer B
    const regB = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Customer',
      lastName: 'B',
      email: 'cart.customer.b@test.com',
      password: 'Password123!',
    });
    customerBId = regB.body.data.user.id;
    await User.findByIdAndUpdate(customerBId, { isEmailVerified: true });
    const loginB = await request(app).post('/api/v1/auth/login').send({
      email: 'cart.customer.b@test.com',
      password: 'Password123!',
    });
    customerBToken = loginB.body.data.accessToken;

    // 3. Setup Super Admin
    const regAdmin = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Admin',
      lastName: 'User',
      email: 'cart.admin@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regAdmin.body.data.user.id, {
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
    });
    const loginAdmin = await request(app).post('/api/v1/auth/login').send({
      email: 'cart.admin@test.com',
      password: 'Password123!',
    });
    adminToken = loginAdmin.body.data.accessToken;

    // 4. Setup Product Manager
    const regPM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'PM',
      lastName: 'User',
      email: 'cart.pm@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regPM.body.data.user.id, {
      role: ROLES.PRODUCT_MANAGER,
      isEmailVerified: true,
    });
    const loginPM = await request(app).post('/api/v1/auth/login').send({
      email: 'cart.pm@test.com',
      password: 'Password123!',
    });
    productManagerToken = loginPM.body.data.accessToken;

    // 5. Seed Categories & Brands
    const activeCat = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      isActive: true,
    });
    activeCategoryId = activeCat._id.toString();

    const inactiveCat = await Category.create({
      name: 'Old Outdated',
      slug: 'old-outdated',
      isActive: false,
    });
    inactiveCategoryId = inactiveCat._id.toString();

    const activeBr = await Brand.create({
      name: 'Apple',
      slug: 'apple',
      normalizedName: 'apple',
      isActive: true,
    });
    activeBrandId = activeBr._id.toString();

    const inactiveBr = await Brand.create({
      name: 'Defunct Brand',
      slug: 'defunct-brand',
      normalizedName: 'defunct brand',
      isActive: false,
    });
    inactiveBrandId = inactiveBr._id.toString();

    // 6. Seed Products
    const activeProd = await Product.create({
      name: 'iPhone 16 Pro',
      slug: 'iphone-16-pro',
      categoryId: activeCat._id,
      brandId: activeBr._id,
      status: PRODUCT_STATUS.ACTIVE,
      images: [
        {
          url: 'https://images.unsplash.com/photo-iphone16.jpg',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    });
    activeProductId = activeProd._id.toString();

    const draftProd = await Product.create({
      name: 'iPhone 17 Future',
      slug: 'iphone-17-future',
      categoryId: activeCat._id,
      status: PRODUCT_STATUS.DRAFT,
    });
    draftProductId = draftProd._id.toString();

    const inactiveProd = await Product.create({
      name: 'iPhone 13 Inactive',
      slug: 'iphone-13-inactive',
      categoryId: activeCat._id,
      status: PRODUCT_STATUS.INACTIVE,
    });
    inactiveProductId = inactiveProd._id.toString();

    const archivedProd = await Product.create({
      name: 'iPhone 5 Archived',
      slug: 'iphone-5-archived',
      categoryId: activeCat._id,
      status: PRODUCT_STATUS.ARCHIVED,
    });
    archivedProductId = archivedProd._id.toString();

    const prodWithInactiveCat = await Product.create({
      name: 'Gadget with Inactive Cat',
      slug: 'gadget-inactive-cat',
      categoryId: inactiveCat._id,
      status: PRODUCT_STATUS.ACTIVE,
    });

    const prodWithInactiveBrand = await Product.create({
      name: 'Gadget with Inactive Brand',
      slug: 'gadget-inactive-brand',
      categoryId: activeCat._id,
      brandId: inactiveBr._id,
      status: PRODUCT_STATUS.ACTIVE,
    });

    // 7. Seed Variants
    const v1 = await ProductVariant.create({
      productId: activeProd._id,
      sku: 'IPH16-BLK-256',
      price: 35000000, // PKR 350,000.00
      attributes: [
        { name: 'Color', value: 'Black' },
        { name: 'Storage', value: '256GB' },
      ],
      attributeSignature: 'color:black|storage:256gb',
      isActive: true,
    });
    activeVariant1Id = v1._id.toString();

    const v2 = await ProductVariant.create({
      productId: activeProd._id,
      sku: 'IPH16-WHT-512',
      price: 40000000, // PKR 400,000.00
      attributes: [
        { name: 'Color', value: 'White' },
        { name: 'Storage', value: '512GB' },
      ],
      attributeSignature: 'color:white|storage:512gb',
      isActive: true,
    });
    activeVariant2Id = v2._id.toString();

    const vInactive = await ProductVariant.create({
      productId: activeProd._id,
      sku: 'IPH16-GLD-1TB',
      price: 50000000,
      attributes: [
        { name: 'Color', value: 'Gold' },
        { name: 'Storage', value: '1TB' },
      ],
      attributeSignature: 'color:gold|storage:1tb',
      isActive: false,
    });
    inactiveVariantId = vInactive._id.toString();

    const vInactCat = await ProductVariant.create({
      productId: prodWithInactiveCat._id,
      sku: 'INACT-CAT-01',
      price: 1000000,
      attributeSignature: 'default',
      isActive: true,
    });
    prodInactiveCatVariantId = vInactCat._id.toString();

    const vInactBr = await ProductVariant.create({
      productId: prodWithInactiveBrand._id,
      sku: 'INACT-BR-01',
      price: 2000000,
      attributeSignature: 'default',
      isActive: true,
    });
    prodInactiveBrandVariantId = vInactBr._id.toString();

    // Draft / Inactive / Archived variants
    await ProductVariant.create({
      productId: draftProd._id,
      sku: 'DRAFT-VAR-01',
      price: 1000000,
      attributeSignature: 'default',
      isActive: true,
    });
    await ProductVariant.create({
      productId: inactiveProd._id,
      sku: 'INACT-PROD-01',
      price: 1000000,
      attributeSignature: 'default',
      isActive: true,
    });
    await ProductVariant.create({
      productId: archivedProd._id,
      sku: 'ARCH-PROD-01',
      price: 1000000,
      attributeSignature: 'default',
      isActive: true,
    });

    // Seed inventory stock for all test variants
    const allVariants = await ProductVariant.find({});
    for (const v of allVariants) {
      await Inventory.create({
        variantId: v._id,
        onHand: 100,
        reserved: 0,
        lowStockThreshold: 5,
      });
    }
  });

  afterAll(async () => {
    await Cart.deleteMany({});
    await InventoryTransaction.deleteMany({});
    await Inventory.deleteMany({});
    await ProductVariant.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await User.deleteMany({

      email: {
        $in: [
          'cart.customer.a@test.com',
          'cart.customer.b@test.com',
          'cart.admin@test.com',
          'cart.pm@test.com',
        ],
      },
    });
  });

  describe('1. Empty Cart & Lazy Creation (AC-01, AC-02, AC-04, AC-06)', () => {
    it('AC-04: returns 200 with empty Cart payload when customer has no Cart document yet', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart).toBeDefined();
      expect(res.body.data.cart.items).toEqual([]);
      expect(res.body.data.cart.itemCount).toBe(0);
      expect(res.body.data.cart.totalQuantity).toBe(0);
      expect(res.body.data.cart.subtotal).toBe(0);
      expect(res.body.data.cart.currency).toBe('PKR');
    });
  });

  describe('2. Adding Items & Duplicate Handling (AC-03, AC-05, AC-07, AC-08, AC-80)', () => {
    it('AC-05 & AC-06: adds active Variant to cart and creates Cart document lazily', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: activeVariant1Id,
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { cart } = res.body.data;
      expect(cart.items.length).toBe(1);
      expect(cart.itemCount).toBe(1);
      expect(cart.totalQuantity).toBe(2);
      expect(cart.items[0].variantId).toBe(activeVariant1Id);
      expect(cart.items[0].productName).toBe('iPhone 16 Pro');
      expect(cart.items[0].sku).toBe('IPH16-BLK-256');
      expect(cart.items[0].unitPrice).toBe(35000000);
      expect(cart.items[0].lineTotal).toBe(70000000);
      expect(cart.items[0].isAvailable).toBe(true);
      expect(cart.subtotal).toBe(70000000);
      expect(cart.currency).toBe('PKR');
    });

    it('AC-07 & AC-08 & AC-80: adding same Variant again increments quantity without creating duplicate line', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: activeVariant1Id,
          quantity: 1,
        });

      expect(res.status).toBe(200);
      const { cart } = res.body.data;
      expect(cart.items.length).toBe(1);
      expect(cart.itemCount).toBe(1);
      expect(cart.totalQuantity).toBe(3);
      expect(cart.items[0].quantity).toBe(3);
      expect(cart.items[0].lineTotal).toBe(105000000);
      expect(cart.subtotal).toBe(105000000);
    });

    it('adds a second distinct Variant line correctly', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: activeVariant2Id,
          quantity: 2,
        });

      expect(res.status).toBe(200);
      const { cart } = res.body.data;
      expect(cart.items.length).toBe(2);
      expect(cart.itemCount).toBe(2);
      expect(cart.totalQuantity).toBe(5);
      expect(cart.subtotal).toBe(105000000 + 80000000); // 185,000,000
    });
  });

  describe('3. Quantity Bounds & Overflow Rules (AC-09, AC-10, AC-81, AC-94)', () => {
    it('AC-12: updates item quantity to valid boundary 1', async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${activeVariant1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ quantity: 1 });

      expect(res.status).toBe(200);
      const v1Item = res.body.data.cart.items.find(
        (i: { variantId: string }) => i.variantId === activeVariant1Id
      );
      expect(v1Item.quantity).toBe(1);
      expect(v1Item.lineTotal).toBe(35000000);
    });

    it('AC-12: updates item quantity to maximum limit 99', async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${activeVariant1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ quantity: 99 });

      expect(res.status).toBe(200);
      const v1Item = res.body.data.cart.items.find(
        (i: { variantId: string }) => i.variantId === activeVariant1Id
      );
      expect(v1Item.quantity).toBe(99);
    });

    it('AC-09 & AC-81: rejects quantity 0 with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${activeVariant1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ quantity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('AC-09 & AC-81: rejects negative quantity with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${activeVariant1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ quantity: -5 });

      expect(res.status).toBe(400);
    });

    it('AC-09 & AC-81: rejects fractional/float quantity with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${activeVariant1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ quantity: 2.5 });

      expect(res.status).toBe(400);
    });

    it('AC-10 & AC-81: rejects quantity 100 (> 99) with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${activeVariant1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ quantity: 100 });

      expect(res.status).toBe(400);
    });

    it('AC-94: rejects addition that causes quantity to overflow 99 (ERR_CART_QUANTITY_LIMIT)', async () => {
      // Currently activeVariant1Id is at 99. Adding 1 more should reject.
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: activeVariant1Id,
          quantity: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_CART_QUANTITY_LIMIT');
    });
  });

  describe('4. Distinct Cart Items Limit (AC-11, AC-93)', () => {
    it('AC-11 & AC-93: enforces 50 distinct items limit (ERR_CART_ITEM_LIMIT_REACHED)', async () => {
      // Set customer A's cart to have 50 items directly in DB
      const dummyVariants: string[] = [];
      for (let i = 0; i < 48; i++) {
        const v = await ProductVariant.create({
          productId: activeProductId,
          sku: `LIMIT-TEST-SKU-${i}`,
          price: 100000,
          attributeSignature: `limit:${i}`,
          isActive: true,
        });
        dummyVariants.push(v._id.toString());
      }

      const cart = await Cart.findOne({ userId: customerAId });
      expect(cart).toBeDefined();
      if (cart) {
        // Now cart currently has 2 items. Add the 48 dummy items to reach exactly 50
        for (const dId of dummyVariants) {
          cart.items.push({
            variantId: new mongoose.Types.ObjectId(dId),
            quantity: 1,
            addedAt: new Date(),
          });
        }
        await cart.save();
      }

      // Create a 51st variant
      const extraVariant = await ProductVariant.create({
        productId: activeProductId,
        sku: 'LIMIT-TEST-SKU-51',
        price: 100000,
        attributeSignature: 'limit:51',
        isActive: true,
      });

      // Attempt to add 51st item
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: extraVariant._id.toString(),
          quantity: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_CART_ITEM_LIMIT_REACHED');

      // Cleanup dummy items for subsequent tests
      if (cart) {
        cart.items = cart.items.slice(0, 2);
        await cart.save();
      }
      await ProductVariant.deleteMany({
        _id: {
          $in: [...dummyVariants, extraVariant._id.toString()].map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      });
    });
  });

  describe('5. Remove Item & Clear Cart (AC-13, AC-14, AC-82, AC-83)', () => {
    it('AC-13 & AC-82: removes existing item from cart', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/items/${activeVariant1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(1);
      expect(res.body.data.cart.items[0].variantId).toBe(activeVariant2Id);
    });

    it('AC-82: returns 404 ERR_CART_ITEM_NOT_FOUND when removing non-existent cart item', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/items/${activeVariant1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_CART_ITEM_NOT_FOUND');
    });

    it('AC-14 & AC-83: clears entire cart', async () => {
      const res = await request(app)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items).toEqual([]);
      expect(res.body.data.cart.itemCount).toBe(0);
      expect(res.body.data.cart.totalQuantity).toBe(0);
      expect(res.body.data.cart.subtotal).toBe(0);
    });
  });

  describe('6. User Isolation & Security Protections (AC-15, AC-16, AC-84, CART-SEC-01 to 04)', () => {
    it('CART-SEC-01: unauthenticated requests to cart endpoints return 401', async () => {
      const getRes = await request(app).get('/api/v1/cart');
      expect(getRes.status).toBe(401);

      const postRes = await request(app)
        .post('/api/v1/cart/items')
        .send({ variantId: activeVariant1Id, quantity: 1 });
      expect(postRes.status).toBe(401);

      const patchRes = await request(app)
        .patch(`/api/v1/cart/items/${activeVariant1Id}`)
        .send({ quantity: 1 });
      expect(patchRes.status).toBe(401);

      const delRes = await request(app).delete(
        `/api/v1/cart/items/${activeVariant1Id}`
      );
      expect(delRes.status).toBe(401);
    });

    it('AC-84 & CART-SEC-02: User A and User B have completely isolated carts', async () => {
      // Customer A adds variant 1
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ variantId: activeVariant1Id, quantity: 2 });

      // Customer B adds variant 2
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ variantId: activeVariant2Id, quantity: 4 });

      // Check Customer A cart
      const resA = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(resA.body.data.cart.items.length).toBe(1);
      expect(resA.body.data.cart.items[0].variantId).toBe(activeVariant1Id);
      expect(resA.body.data.cart.totalQuantity).toBe(2);

      // Check Customer B cart
      const resB = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerBToken}`);
      expect(resB.body.data.cart.items.length).toBe(1);
      expect(resB.body.data.cart.items[0].variantId).toBe(activeVariant2Id);
      expect(resB.body.data.cart.totalQuantity).toBe(4);
    });

    it('CART-SEC-03 & AC-96: rejects request body attempting to supply or override userId', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({
          variantId: activeVariant1Id,
          quantity: 1,
          userId: customerAId, // malicious override attempt
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('CART-SEC-04 & AC-95: rejects request body attempting to tamper with unitPrice / lineTotal', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({
          variantId: activeVariant1Id,
          quantity: 1,
          price: 100, // malicious tampering attempt
          unitPrice: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('AC-38 & AC-39 & AC-86: staff roles (SUPER_ADMIN, PRODUCT_MANAGER) are blocked with 403 Forbidden', async () => {
      const resAdmin = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(403);
      expect(resAdmin.body.error.code).toBe('ERR_FORBIDDEN');

      const resPM = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ variantId: activeVariant1Id, quantity: 1 });
      expect(resPM.status).toBe(403);
    });
  });

  describe('7. Catalog Availability Rules (AC-24 to AC-29, AC-87 to AC-89, CART-SEC-05 to 08)', () => {
    it('AC-24 & CART-SEC-05: cannot add inactive variant to cart (409 ERR_CART_VARIANT_UNAVAILABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: inactiveVariantId,
          quantity: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_CART_VARIANT_UNAVAILABLE');
    });

    it('AC-25 & CART-SEC-06: cannot add variant belonging to DRAFT product (409 ERR_CART_PRODUCT_UNAVAILABLE)', async () => {
      const draftVariant = await ProductVariant.findOne({
        productId: draftProductId,
      });
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: draftVariant!._id.toString(),
          quantity: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_CART_PRODUCT_UNAVAILABLE');
    });

    it('AC-26 & CART-SEC-06: cannot add variant belonging to INACTIVE product (409 ERR_CART_PRODUCT_UNAVAILABLE)', async () => {
      const inactVariant = await ProductVariant.findOne({
        productId: inactiveProductId,
      });
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: inactVariant!._id.toString(),
          quantity: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_CART_PRODUCT_UNAVAILABLE');
    });

    it('AC-27 & CART-SEC-06: cannot add variant belonging to ARCHIVED product (409 ERR_CART_PRODUCT_UNAVAILABLE)', async () => {
      const archVariant = await ProductVariant.findOne({
        productId: archivedProductId,
      });
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: archVariant!._id.toString(),
          quantity: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_CART_PRODUCT_UNAVAILABLE');
    });

    it('AC-28 & CART-SEC-07: cannot add product under inactive category (409 ERR_CART_PRODUCT_UNAVAILABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: prodInactiveCatVariantId,
          quantity: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_CART_PRODUCT_UNAVAILABLE');
    });

    it('AC-29 & CART-SEC-08: cannot add product under inactive brand (409 ERR_CART_PRODUCT_UNAVAILABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          variantId: prodInactiveBrandVariantId,
          quantity: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_CART_PRODUCT_UNAVAILABLE');
    });
  });

  describe('8. Dynamic Pricing & Unavailable Items Handling (AC-18, AC-30 to AC-35, AC-90 to AC-92, CART-SEC-09 & 10)', () => {
    it('AC-35 & AC-91 & CART-SEC-09: dynamic price updates are reflected on subsequent Cart fetch', async () => {
      // Current activeVariant1 price is 35000000. Update it in MongoDB to 38000000.
      await ProductVariant.findByIdAndUpdate(activeVariant1Id, {
        price: 38000000,
      });

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      const v1Item = res.body.data.cart.items.find(
        (i: { variantId: string }) => i.variantId === activeVariant1Id
      );
      expect(v1Item.unitPrice).toBe(38000000);
      expect(v1Item.lineTotal).toBe(38000000 * v1Item.quantity);
      expect(res.body.data.cart.subtotal).toBe(38000000 * v1Item.quantity);
    });

    it('AC-30, AC-31, AC-32, AC-90: variant deactivated after addition is marked isAvailable=false and excluded from subtotal', async () => {
      // Add activeVariant2 to Customer A's cart
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ variantId: activeVariant2Id, quantity: 1 });

      // Admin deactivates activeVariant1
      await ProductVariant.findByIdAndUpdate(activeVariant1Id, {
        isActive: false,
      });

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      const { cart } = res.body.data;
      expect(cart.items.length).toBe(2);

      const v1Item = cart.items.find(
        (i: { variantId: string }) => i.variantId === activeVariant1Id
      );
      const v2Item = cart.items.find(
        (i: { variantId: string }) => i.variantId === activeVariant2Id
      );

      expect(v1Item.isAvailable).toBe(false);
      expect(v1Item.unavailableReason).toBe('VARIANT_INACTIVE');
      expect(v1Item.lineTotal).toBe(0);

      expect(v2Item.isAvailable).toBe(true);
      expect(v2Item.lineTotal).toBe(40000000);

      // Subtotal should strictly only include v2
      expect(cart.subtotal).toBe(40000000);

      // Reactivate variant 1
      await ProductVariant.findByIdAndUpdate(activeVariant1Id, {
        isActive: true,
      });
    });

    it('AC-33 & AC-34 & AC-92 & CART-SEC-10: deleted variant does not crash Cart and can still be removed', async () => {
      // Create temporary variant, add to cart, then hard delete it
      const tempVariant = await ProductVariant.create({
        productId: activeProductId,
        sku: 'TEMP-HARD-DELETE',
        price: 99000,
        attributeSignature: 'temp:delete',
        isActive: true,
      });
      const tempVariantId = tempVariant._id.toString();

      await Inventory.create({
        variantId: tempVariant._id,
        onHand: 10,
        reserved: 0,
        lowStockThreshold: 5,
      });

      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ variantId: tempVariantId, quantity: 1 });


      // Hard delete from database
      await ProductVariant.findByIdAndDelete(tempVariantId);

      // Fetch cart - should return 200 with unavailable item marked
      const getRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(getRes.status).toBe(200);
      const deletedItem = getRes.body.data.cart.items.find(
        (i: { variantId: string }) => i.variantId === tempVariantId
      );
      expect(deletedItem).toBeDefined();
      expect(deletedItem.isAvailable).toBe(false);
      expect(deletedItem.unavailableReason).toBe('VARIANT_NOT_FOUND');

      // Customer can still remove the deleted variant line
      const delRes = await request(app)
        .delete(`/api/v1/cart/items/${tempVariantId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(delRes.status).toBe(200);
      const remainingItem = delRes.body.data.cart.items.find(
        (i: { variantId: string }) => i.variantId === tempVariantId
      );
      expect(remainingItem).toBeUndefined();
    });
  });
});
