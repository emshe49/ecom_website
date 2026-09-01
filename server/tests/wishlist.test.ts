import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/users/user.model.js';
import { Category } from '../src/modules/catalog/categories/category.model.js';
import { Brand } from '../src/modules/catalog/brands/brand.model.js';
import { Product } from '../src/modules/catalog/products/product.model.js';
import { ProductVariant } from '../src/modules/catalog/products/product-variant.model.js';

import { Wishlist } from '../src/modules/wishlist/wishlist.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { InventoryTransaction } from '../src/modules/inventory/inventory-transaction.model.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import { PRODUCT_STATUS } from '../src/modules/catalog/products/product.constants.js';
import { UNAVAILABLE_REASON } from '../src/modules/wishlist/wishlist.constants.js';
import { env } from '../src/config/env.js';

const app = createApp();

describe('Module 09: Customer Wishlist Management Test Suite', () => {
  let customerAToken: string;
  let customerBToken: string;
  let superAdminToken: string;
  let productManagerToken: string;

  let activeCategoryId: string;
  let inactiveCategoryId: string;
  let activeBrandId: string;
  let inactiveBrandId: string;

  let publicProductAId: string;
  let publicProductBId: string;
  let publicProductCId: string;
  let draftProductId: string;
  let inactiveProductId: string;
  let archivedProductId: string;
  let prodInactiveCatId: string;
  let prodInactiveBrandId: string;
  let prodNoVariantsId: string;

  let variantA1Id: string;
  let variantA2Id: string;
  let variantB1Id: string;
  let variantC1Id: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    // Clean test state
    await Wishlist.deleteMany({});
    await InventoryTransaction.deleteMany({});
    await Inventory.deleteMany({});
    await ProductVariant.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});

    await User.deleteMany({
      email: {
        $in: [
          'wishlist.cust.a@test.com',
          'wishlist.cust.b@test.com',
          'wishlist.admin@test.com',
          'wishlist.pm@test.com',
        ],
      },
    });

    // 1. Setup Customer A
    const regCustA = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Customer',
      lastName: 'Alpha',
      email: 'wishlist.cust.a@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regCustA.body.data.user.id, {
      isEmailVerified: true,
    });
    const loginCustA = await request(app).post('/api/v1/auth/login').send({
      email: 'wishlist.cust.a@test.com',
      password: 'Password123!',
    });
    customerAToken = loginCustA.body.data.accessToken;

    // 2. Setup Customer B
    const regCustB = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Customer',
      lastName: 'Beta',
      email: 'wishlist.cust.b@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regCustB.body.data.user.id, {
      isEmailVerified: true,
    });
    const loginCustB = await request(app).post('/api/v1/auth/login').send({
      email: 'wishlist.cust.b@test.com',
      password: 'Password123!',
    });
    customerBToken = loginCustB.body.data.accessToken;

    // 3. Setup Super Admin
    const regAdmin = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'wishlist.admin@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regAdmin.body.data.user.id, {
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
    });
    const loginAdmin = await request(app).post('/api/v1/auth/login').send({
      email: 'wishlist.admin@test.com',
      password: 'Password123!',
    });
    superAdminToken = loginAdmin.body.data.accessToken;

    // 4. Setup Product Manager
    const regPM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Product',
      lastName: 'Manager',
      email: 'wishlist.pm@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regPM.body.data.user.id, {
      role: ROLES.PRODUCT_MANAGER,
      isEmailVerified: true,
    });
    const loginPM = await request(app).post('/api/v1/auth/login').send({
      email: 'wishlist.pm@test.com',
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
      name: 'Sony',
      slug: 'sony',
      normalizedName: 'sony',
      isActive: true,
    });
    activeBrandId = activeBr._id.toString();

    const inactiveBr = await Brand.create({
      name: 'Vintage Audio',
      slug: 'vintage-audio',
      normalizedName: 'vintage audio',
      isActive: false,
    });
    inactiveBrandId = inactiveBr._id.toString();

    // 6. Seed Products
    const prodA = await Product.create({
      name: 'Sony WH-1000XM5',
      slug: 'sony-wh-1000xm5',
      shortDescription: 'Flagship noise cancelling headphones',
      categoryId: activeCat._id,
      brandId: activeBr._id,
      status: PRODUCT_STATUS.ACTIVE,
      featured: true,
      images: [
        { url: 'https://example.com/xm5.jpg', isPrimary: true, sortOrder: 0 },
      ],
    });
    publicProductAId = prodA._id.toString();

    const vA1 = await ProductVariant.create({
      productId: prodA._id,
      sku: 'XM5-BLK',
      price: 39999,
      costPrice: 20000,
      attributes: [{ name: 'Color', value: 'Black' }],
      attributeSignature: 'color:black',
      isActive: true,
    });
    variantA1Id = vA1._id.toString();

    const vA2 = await ProductVariant.create({
      productId: prodA._id,
      sku: 'XM5-SLV',
      price: 41999,
      costPrice: 21000,
      attributes: [{ name: 'Color', value: 'Silver' }],
      attributeSignature: 'color:silver',
      isActive: true,
    });
    variantA2Id = vA2._id.toString();

    const prodB = await Product.create({
      name: 'Sony PlayStation 5',
      slug: 'sony-ps5',
      shortDescription: 'Next-gen gaming console',
      categoryId: activeCat._id,
      brandId: activeBr._id,
      status: PRODUCT_STATUS.ACTIVE,
      featured: false,
    });
    publicProductBId = prodB._id.toString();

    const vB1 = await ProductVariant.create({
      productId: prodB._id,
      sku: 'PS5-DISC',
      price: 49999,
      costPrice: 35000,
      attributes: [],
      attributeSignature: 'default',
      isActive: true,
    });
    variantB1Id = vB1._id.toString();

    const prodC = await Product.create({
      name: 'Sony Bravia 65"',
      slug: 'sony-bravia-65',
      shortDescription: '4K OLED Smart TV',
      categoryId: activeCat._id,
      brandId: activeBr._id,
      status: PRODUCT_STATUS.ACTIVE,
      featured: false,
    });
    publicProductCId = prodC._id.toString();

    const vC1 = await ProductVariant.create({
      productId: prodC._id,
      sku: 'BRAVIA-65',
      price: 199999,
      costPrice: 120000,
      attributes: [],
      attributeSignature: 'default',
      isActive: true,
    });
    variantC1Id = vC1._id.toString();

    // Draft / Inactive / Archived / Invalid products
    const prodDraft = await Product.create({
      name: 'Unreleased Device',
      slug: 'unreleased-device',
      categoryId: activeCat._id,
      brandId: activeBr._id,
      status: PRODUCT_STATUS.DRAFT,
    });
    draftProductId = prodDraft._id.toString();
    await ProductVariant.create({
      productId: prodDraft._id,
      sku: 'UNREL-01',
      price: 10000,
      attributes: [],
      attributeSignature: 'default',
      isActive: true,
    });

    const prodInact = await Product.create({
      name: 'Discontinued Camcorder',
      slug: 'discontinued-camcorder',
      categoryId: activeCat._id,
      brandId: activeBr._id,
      status: PRODUCT_STATUS.INACTIVE,
    });
    inactiveProductId = prodInact._id.toString();
    await ProductVariant.create({
      productId: prodInact._id,
      sku: 'CAM-01',
      price: 15000,
      attributes: [],
      attributeSignature: 'default',
      isActive: true,
    });

    const prodArch = await Product.create({
      name: 'Archived Walkman',
      slug: 'archived-walkman',
      categoryId: activeCat._id,
      brandId: activeBr._id,
      status: PRODUCT_STATUS.ARCHIVED,
    });
    archivedProductId = prodArch._id.toString();
    await ProductVariant.create({
      productId: prodArch._id,
      sku: 'WALK-01',
      price: 5000,
      attributes: [],
      attributeSignature: 'default',
      isActive: true,
    });

    const prodInactCat = await Product.create({
      name: 'Old TV',
      slug: 'old-tv',
      categoryId: inactiveCat._id,
      brandId: activeBr._id,
      status: PRODUCT_STATUS.ACTIVE,
    });
    prodInactiveCatId = prodInactCat._id.toString();
    await ProductVariant.create({
      productId: prodInactCat._id,
      sku: 'OLD-TV',
      price: 8000,
      attributes: [],
      attributeSignature: 'default',
      isActive: true,
    });

    const prodInactBr = await Product.create({
      name: 'Vintage Turntable',
      slug: 'vintage-turntable',
      categoryId: activeCat._id,
      brandId: inactiveBr._id,
      status: PRODUCT_STATUS.ACTIVE,
    });
    prodInactiveBrandId = prodInactBr._id.toString();
    await ProductVariant.create({
      productId: prodInactBr._id,
      sku: 'VINT-01',
      price: 12000,
      attributes: [],
      attributeSignature: 'default',
      isActive: true,
    });

    const prodNoVar = await Product.create({
      name: 'Ghost Product',
      slug: 'ghost-product',
      categoryId: activeCat._id,
      brandId: activeBr._id,
      status: PRODUCT_STATUS.ACTIVE,
    });
    prodNoVariantsId = prodNoVar._id.toString();

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
    await Wishlist.deleteMany({});
    await InventoryTransaction.deleteMany({});
    await Inventory.deleteMany({});
    await ProductVariant.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await User.deleteMany({

      email: {
        $in: [
          'wishlist.cust.a@test.com',
          'wishlist.cust.b@test.com',
          'wishlist.admin@test.com',
          'wishlist.pm@test.com',
        ],
      },
    });
  });

  // -------------------------------------------------------------
  // 1. Authentication & Role Enforcement (AC-01, AC-12, AC-30, AC-31, WISHLIST-SEC-01)
  // -------------------------------------------------------------
  describe('1. Authentication & Role Enforcement (AC-01, AC-12, AC-30, AC-31, WISHLIST-SEC-01)', () => {
    it('WISHLIST-SEC-01: unauthenticated requests receive 401 Unauthorized', async () => {
      const getRes = await request(app).get('/api/v1/wishlist');
      expect(getRes.status).toBe(401);

      const postRes = await request(app)
        .post('/api/v1/wishlist/items')
        .send({ productId: publicProductAId });
      expect(postRes.status).toBe(401);

      const delRes = await request(app).delete(
        `/api/v1/wishlist/items/${publicProductAId}`
      );
      expect(delRes.status).toBe(401);

      const clearRes = await request(app).delete('/api/v1/wishlist');
      expect(clearRes.status).toBe(401);
    });

    it('AC-31: staff operational accounts receive 403 Forbidden', async () => {
      const adminRes = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(adminRes.status).toBe(403);

      const pmRes = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ productId: publicProductAId });
      expect(pmRes.status).toBe(403);
    });

    it('AC-04 & AC-30: authenticated CUSTOMER can access Wishlist (returns 200 with empty state if none exists)', async () => {
      const res = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.wishlist).toBeDefined();
      expect(res.body.data.wishlist.items).toEqual([]);
      expect(res.body.data.wishlist.itemCount).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 2. Add Product & Idempotency (AC-05, AC-06, AC-07, AC-08, AC-20, AC-21, AC-29)
  // -------------------------------------------------------------
  describe('2. Add Product & Idempotency (AC-05, AC-06, AC-07, AC-08, AC-20, AC-21, AC-29)', () => {
    it('AC-05 & AC-06: customer can add a public product to wishlist (lazily creates wishlist)', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: publicProductAId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const wishlist = res.body.data.wishlist;
      expect(wishlist.itemCount).toBe(1);
      expect(wishlist.items.length).toBe(1);

      const item = wishlist.items[0];
      expect(item.productId).toBe(publicProductAId);
      expect(item.name).toBe('Sony WH-1000XM5');
      expect(item.slug).toBe('sony-wh-1000xm5');
      expect(item.category.name).toBe('Electronics');
      expect(item.brand.name).toBe('Sony');
      expect(item.isAvailable).toBe(true);
      expect(item.unavailableReason).toBeNull();
      expect(item.priceRange).toEqual({
        min: 39999,
        max: 41999,
        currency: env.STORE_CURRENCY,
      });

      expect(item.availableVariantCount).toBe(2);
      expect(item.variants.length).toBe(2);
    });

    it('AC-07 & AC-08: adding the same product twice is idempotent and preserves original addedAt', async () => {
      // First add
      const firstRes = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: publicProductAId });
      expect(firstRes.status).toBe(200);
      const originalAddedAt = firstRes.body.data.wishlist.items[0].addedAt;

      // Second add
      const secondRes = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: publicProductAId });
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.data.wishlist.itemCount).toBe(1);
      expect(secondRes.body.data.wishlist.items[0].addedAt).toBe(originalAddedAt);
    });

    it('AC-29: multiple products are sorted newest-added first', async () => {
      // Add Product B
      await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: publicProductBId });

      // Add Product C
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: publicProductCId });

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist.itemCount).toBe(3);
      // Newest first: C, B, A
      expect(res.body.data.wishlist.items[0].productId).toBe(publicProductCId);
      expect(res.body.data.wishlist.items[1].productId).toBe(publicProductBId);
      expect(res.body.data.wishlist.items[2].productId).toBe(publicProductAId);
    });
  });

  // -------------------------------------------------------------
  // 3. Catalog Availability Rules on Add (AC-14 to AC-19, WISHLIST-SEC-05 to 08)
  // -------------------------------------------------------------
  describe('3. Catalog Availability Rules on Add (AC-14 to AC-19, WISHLIST-SEC-05 to 08)', () => {
    it('WISHLIST-SEC-05 & AC-14: cannot add DRAFT product (409 ERR_WISHLIST_PRODUCT_UNAVAILABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: draftProductId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_WISHLIST_PRODUCT_UNAVAILABLE');
    });

    it('WISHLIST-SEC-05 & AC-15: cannot add INACTIVE product (409 ERR_WISHLIST_PRODUCT_UNAVAILABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: inactiveProductId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_WISHLIST_PRODUCT_UNAVAILABLE');
    });

    it('WISHLIST-SEC-05 & AC-16: cannot add ARCHIVED product (409 ERR_WISHLIST_PRODUCT_UNAVAILABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: archivedProductId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_WISHLIST_PRODUCT_UNAVAILABLE');
    });

    it('WISHLIST-SEC-06 & AC-17: cannot add product under inactive Category (409 ERR_WISHLIST_PRODUCT_UNAVAILABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: prodInactiveCatId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_WISHLIST_PRODUCT_UNAVAILABLE');
    });

    it('WISHLIST-SEC-07 & AC-18: cannot add product under inactive Brand (409 ERR_WISHLIST_PRODUCT_UNAVAILABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: prodInactiveBrandId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_WISHLIST_PRODUCT_UNAVAILABLE');
    });

    it('WISHLIST-SEC-08 & AC-19: cannot add product without active variants (409 ERR_WISHLIST_PRODUCT_UNAVAILABLE)', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: prodNoVariantsId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_WISHLIST_PRODUCT_UNAVAILABLE');
    });

    it('AC-80: adding non-existent product returns 404 ERR_WISHLIST_PRODUCT_NOT_FOUND', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: nonExistentId });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ERR_WISHLIST_PRODUCT_NOT_FOUND');
    });
  });

  // -------------------------------------------------------------
  // 4. Remove Item & Clear Wishlist (AC-10, AC-11, AC-76, AC-77, AC-78)
  // -------------------------------------------------------------
  describe('4. Remove Item & Clear Wishlist (AC-10, AC-11, AC-76, AC-77, AC-78)', () => {
    it('AC-10 & AC-76: customer can remove a saved product', async () => {
      // Remove Product A
      const res = await request(app)
        .delete(`/api/v1/wishlist/items/${publicProductAId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist.itemCount).toBe(2);
      expect(
        res.body.data.wishlist.items.some((i: any) => i.productId === publicProductAId)
      ).toBe(false);
    });

    it('AC-77: removing non-saved product returns 404 ERR_WISHLIST_ITEM_NOT_FOUND', async () => {
      const nonSavedId = new Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/v1/wishlist/items/${nonSavedId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ERR_WISHLIST_ITEM_NOT_FOUND');
    });

    it('AC-11 & AC-78: customer can clear entire wishlist', async () => {
      // Clear
      const res = await request(app)
        .delete('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist.items).toEqual([]);
      expect(res.body.data.wishlist.itemCount).toBe(0);

      // Verify on subsequent GET
      const getRes = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(getRes.body.data.wishlist.items).toEqual([]);
      expect(getRes.body.data.wishlist.itemCount).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 5. Wishlist Size Limit (AC-09, AC-79)
  // -------------------------------------------------------------
  describe('5. Wishlist Size Limit (AC-09, AC-79)', () => {
    it('AC-09 & AC-79: enforces MAX_WISHLIST_ITEMS = 100 limit', async () => {
      const user = await User.findOne({ email: 'wishlist.cust.a@test.com' });
      const mockItems = Array.from({ length: 100 }, () => ({
        productId: new Types.ObjectId(),
        addedAt: new Date(),
      }));

      await Wishlist.updateOne(
        { userId: user!._id },
        { items: mockItems },
        { upsert: true }
      );

      // Try adding 101st item
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: publicProductAId });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_WISHLIST_ITEM_LIMIT_REACHED');

      // Reset customer A wishlist
      await Wishlist.deleteOne({ userId: user!._id });
    });
  });

  // -------------------------------------------------------------
  // 6. Dynamic Pricing & Availability Reflection (AC-21, AC-22, AC-23, AC-24, AC-87, AC-88)
  // -------------------------------------------------------------
  describe('6. Dynamic Pricing & Availability Reflection (AC-21, AC-22, AC-23, AC-24, AC-87, AC-88)', () => {
    it('AC-22 & AC-88: variant price updates are dynamically reflected in priceRange', async () => {
      // Add Product A
      await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: publicProductAId });

      // Admin updates variant price
      await ProductVariant.updateOne(
        { _id: new Types.ObjectId(variantA1Id) },
        { price: 45000 }
      );

      // GET wishlist
      const res = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      const item = res.body.data.wishlist.items[0];
      // min is 41999 (variantA2), max is 45000 (variantA1)
      expect(item.priceRange).toEqual({
        min: 41999,
        max: 45000,
        currency: env.STORE_CURRENCY,
      });

    });

    it('AC-23 & AC-24 & AC-87: deactivated product is marked isAvailable=false (PRODUCT_INACTIVE) on GET', async () => {
      // Admin sets Product A inactive
      await Product.updateOne(
        { _id: new Types.ObjectId(publicProductAId) },
        { status: PRODUCT_STATUS.INACTIVE }
      );

      // GET wishlist
      const res = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      const item = res.body.data.wishlist.items[0];
      expect(item.isAvailable).toBe(false);
      expect(item.unavailableReason).toBe(UNAVAILABLE_REASON.PRODUCT_INACTIVE);

      // Restore Product A to active
      await Product.updateOne(
        { _id: new Types.ObjectId(publicProductAId) },
        { status: PRODUCT_STATUS.ACTIVE }
      );
    });

    it('AC-23 & AC-24: deactivated category marks product isAvailable=false (CATEGORY_INACTIVE)', async () => {
      await Category.updateOne(
        { _id: new Types.ObjectId(activeCategoryId) },
        { isActive: false }
      );

      const res = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      const item = res.body.data.wishlist.items[0];
      expect(item.isAvailable).toBe(false);
      expect(item.unavailableReason).toBe(UNAVAILABLE_REASON.CATEGORY_INACTIVE);

      // Restore Category to active
      await Category.updateOne(
        { _id: new Types.ObjectId(activeCategoryId) },
        { isActive: true }
      );
    });
  });

  // -------------------------------------------------------------
  // 7. Stale / Hard-Deleted Product Resilience (AC-25, AC-26, AC-89, WISHLIST-SEC-10)
  // -------------------------------------------------------------
  describe('7. Stale / Hard-Deleted Product Resilience (AC-25, AC-26, AC-89, WISHLIST-SEC-10)', () => {
    it('AC-25 & AC-26 & AC-89 & WISHLIST-SEC-10: hard-deleted product returns stale entry and can still be removed', async () => {
      // Create temporary product
      const tempProd = await Product.create({
        name: 'Temporary Item',
        slug: 'temp-item',
        categoryId: new Types.ObjectId(activeCategoryId),
        brandId: new Types.ObjectId(activeBrandId),
        status: PRODUCT_STATUS.ACTIVE,
      });
      await ProductVariant.create({
        productId: tempProd._id,
        sku: 'TEMP-SKU',
        price: 1500,
        attributes: [],
        attributeSignature: 'default',
        isActive: true,
      });

      // Add to wishlist
      await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: tempProd._id.toString() });

      // Hard delete temporary product from DB
      await ProductVariant.deleteMany({ productId: tempProd._id });
      await Product.findByIdAndDelete(tempProd._id);

      // GET wishlist does not crash with 500
      const getRes = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(getRes.status).toBe(200);
      const staleItem = getRes.body.data.wishlist.items.find(
        (i: any) => i.productId === tempProd._id.toString()
      );
      expect(staleItem).toBeDefined();
      expect(staleItem.isAvailable).toBe(false);
      expect(staleItem.unavailableReason).toBe(UNAVAILABLE_REASON.PRODUCT_NOT_FOUND);

      // Remove deleted item from wishlist
      const delRes = await request(app)
        .delete(`/api/v1/wishlist/items/${tempProd._id.toString()}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(delRes.status).toBe(200);
      expect(
        delRes.body.data.wishlist.items.some(
          (i: any) => i.productId === tempProd._id.toString()
        )
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 8. User Isolation & Security Criteria (WISHLIST-SEC-02, 03, 04, 09, AC-13, AC-27, AC-42, AC-43, AC-44)
  // -------------------------------------------------------------
  describe('8. User Isolation & Security Criteria (WISHLIST-SEC-02, 03, 04, 09, AC-13, AC-27, AC-42, AC-43, AC-44)', () => {
    it('WISHLIST-SEC-02 & AC-13: Customer A and Customer B have isolated wishlists', async () => {
      // Clear both wishlists first
      await request(app).delete('/api/v1/wishlist').set('Authorization', `Bearer ${customerAToken}`);
      await request(app).delete('/api/v1/wishlist').set('Authorization', `Bearer ${customerBToken}`);

      // Customer A adds Product A
      await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: publicProductAId });

      // Customer B adds Product B
      await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ productId: publicProductBId });

      // Verify Customer A
      const resA = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(resA.body.data.wishlist.itemCount).toBe(1);
      expect(resA.body.data.wishlist.items[0].productId).toBe(publicProductAId);

      // Verify Customer B
      const resB = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerBToken}`);
      expect(resB.body.data.wishlist.itemCount).toBe(1);
      expect(resB.body.data.wishlist.items[0].productId).toBe(publicProductBId);
    });

    it('WISHLIST-SEC-03 & AC-42: body cannot override userId (strict schema validation)', async () => {
      const otherUserId = new Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          productId: publicProductAId,
          userId: otherUserId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('WISHLIST-SEC-04 & AC-43: body cannot inject price or product attributes (strict schema validation)', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          productId: publicProductAId,
          price: 100,
          name: 'Hacked Title',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('WISHLIST-SEC-09 & AC-27: sensitive fields (costPrice, createdBy, updatedBy, attributeSignature) never leak', async () => {
      const res = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      const jsonStr = JSON.stringify(res.body);
      expect(jsonStr).not.toContain('costPrice');
      expect(jsonStr).not.toContain('createdBy');
      expect(jsonStr).not.toContain('updatedBy');
      expect(jsonStr).not.toContain('attributeSignature');
    });

    it('AC-44: invalid Mongo ObjectIds return 400 Bad Request, not 500', async () => {
      const postRes = await request(app)
        .post('/api/v1/wishlist/items')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ productId: 'invalid-mongo-id' });
      expect(postRes.status).toBe(400);

      const delRes = await request(app)
        .delete('/api/v1/wishlist/items/invalid-param-id')
        .set('Authorization', `Bearer ${customerAToken}`);
      expect(delRes.status).toBe(400);
    });
  });
});
