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
import { ROLES } from '../src/modules/authorization/roles.js';

const app = createApp();

describe('Module 06: Products & Variants Test Suite', () => {
  let superAdminToken: string;
  let productManagerToken: string;
  let inventoryManagerToken: string;
  let orderManagerToken: string;
  let customerToken: string;

  let rootCategoryId: string;
  let leafCategoryId: string;
  let inactiveCategoryId: string;
  let activeBrandId: string;
  let inactiveBrandId: string;

  let testProductId: string;
  let secondProductId: string;
  let testVariantId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    // Clean test data
    await User.deleteMany({
      email: {
        $in: [
          'prod.super@test.com',
          'prod.pm@test.com',
          'prod.im@test.com',
          'prod.om@test.com',
          'prod.cust@test.com',
        ],
      },
    });
    await ProductVariant.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});

    // 1. Setup SUPER_ADMIN
    const regSuper = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'prod.super@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regSuper.body.data.user.id, {
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
    });
    const loginSuper = await request(app).post('/api/v1/auth/login').send({
      email: 'prod.super@test.com',
      password: 'Password123!',
    });
    superAdminToken = loginSuper.body.data.accessToken;

    // 2. Setup PRODUCT_MANAGER
    const regPM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Product',
      lastName: 'Manager',
      email: 'prod.pm@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regPM.body.data.user.id, {
      role: ROLES.PRODUCT_MANAGER,
      isEmailVerified: true,
    });
    const loginPM = await request(app).post('/api/v1/auth/login').send({
      email: 'prod.pm@test.com',
      password: 'Password123!',
    });
    productManagerToken = loginPM.body.data.accessToken;

    // 3. Setup INVENTORY_MANAGER
    const regIM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Inventory',
      lastName: 'Manager',
      email: 'prod.im@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regIM.body.data.user.id, {
      role: ROLES.INVENTORY_MANAGER,
      isEmailVerified: true,
    });
    const loginIM = await request(app).post('/api/v1/auth/login').send({
      email: 'prod.im@test.com',
      password: 'Password123!',
    });
    inventoryManagerToken = loginIM.body.data.accessToken;

    // 4. Setup ORDER_MANAGER
    const regOM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Order',
      lastName: 'Manager',
      email: 'prod.om@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regOM.body.data.user.id, {
      role: ROLES.ORDER_MANAGER,
      isEmailVerified: true,
    });
    const loginOM = await request(app).post('/api/v1/auth/login').send({
      email: 'prod.om@test.com',
      password: 'Password123!',
    });
    orderManagerToken = loginOM.body.data.accessToken;

    // 5. Setup CUSTOMER
    await request(app).post('/api/v1/auth/register').send({
      firstName: 'Normal',
      lastName: 'Customer',
      email: 'prod.cust@test.com',
      password: 'Password123!',
    });
    const loginCust = await request(app).post('/api/v1/auth/login').send({
      email: 'prod.cust@test.com',
      password: 'Password123!',
    });
    customerToken = loginCust.body.data.accessToken;

    // 6. Setup Category Hierarchy (Root & Leaf) + Inactive Category
    const rootCatRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${productManagerToken}`)
      .send({ name: 'Apparel', slug: 'apparel' });
    rootCategoryId = rootCatRes.body.data.category.id;

    const leafCatRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${productManagerToken}`)
      .send({ name: 'Sneakers', slug: 'sneakers', parentId: rootCategoryId });
    leafCategoryId = leafCatRes.body.data.category.id;

    const inactCatRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${productManagerToken}`)
      .send({ name: 'Discontinued Gear', slug: 'discontinued-gear', isActive: false });
    inactiveCategoryId = inactCatRes.body.data.category.id;

    // 7. Setup Brands (Active & Inactive)
    const brandRes = await request(app)
      .post('/api/v1/admin/brands')
      .set('Authorization', `Bearer ${productManagerToken}`)
      .send({ name: 'Nike', slug: 'nike' });
    activeBrandId = brandRes.body.data.brand.id;

    const inactBrandRes = await request(app)
      .post('/api/v1/admin/brands')
      .set('Authorization', `Bearer ${productManagerToken}`)
      .send({ name: 'Old Brand', slug: 'old-brand', isActive: false });
    inactiveBrandId = inactBrandRes.body.data.brand.id;
  });

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          'prod.super@test.com',
          'prod.pm@test.com',
          'prod.im@test.com',
          'prod.om@test.com',
          'prod.cust@test.com',
        ],
      },
    });
    await ProductVariant.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await mongoose.disconnect();
  });

  describe('1. Product Creation & Validation Rules', () => {
    it('AC-01 & AC-08: creates a valid product defaulting to DRAFT', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Nike Air Max 270',
          categoryId: leafCategoryId,
          brandId: activeBrandId,
          shortDescription: 'Iconic lifestyle sneaker',
          description: 'The Nike Air Max 270 delivers visible air under every step.',
          featured: true,
          tags: ['Sneaker', 'nike', 'AIR-MAX', 'sneaker'], // Deduplication test
          images: [
            {
              url: 'https://example.com/airmax-front.jpg',
              altText: 'Front View',
              sortOrder: 1,
              isPrimary: true,
            },
            {
              url: 'https://example.com/airmax-side.jpg',
              altText: 'Side View',
              sortOrder: 2,
              isPrimary: false,
            },
          ],
          attributes: [
            { name: 'Material', value: 'Mesh & Synthetic' },
            { name: 'Sole', value: 'Rubber' },
          ],
          seoTitle: 'Buy Nike Air Max 270',
          seoDescription: 'Best price on authentic Nike Air Max 270',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.name).toBe('Nike Air Max 270');
      expect(res.body.data.product.slug).toBe('nike-air-max-270');
      expect(res.body.data.product.status).toBe('DRAFT');
      expect(res.body.data.product.featured).toBe(true);
      expect(res.body.data.product.tags).toEqual(['sneaker', 'nike', 'air-max']); // Normalized
      expect(res.body.data.product.images.length).toBe(2);
      expect(res.body.data.product.images[0].isPrimary).toBe(true);
      expect(res.body.data.product.attributes.length).toBe(2);

      testProductId = res.body.data.product.id;
    });

    it('AC-03: rejects duplicate product slug with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Nike Air Max 270 Duplicate',
          slug: 'nike-air-max-270', // Already taken
          categoryId: leafCategoryId,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_PRODUCT_SLUG_EXISTS');
    });

    it('AC-05: rejects assigning product to a non-leaf category with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Non Leaf Product',
          categoryId: rootCategoryId, // Root category has child 'Sneakers'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_CATEGORY_NOT_LEAF');
    });

    it('AC-04: rejects assigning product to an inactive category with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Inactive Category Product',
          categoryId: inactiveCategoryId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_CATEGORY_INACTIVE');
    });

    it('AC-07: rejects assigning product to an inactive brand with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Inactive Brand Product',
          categoryId: leafCategoryId,
          brandId: inactiveBrandId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_PRODUCT_BRAND_INACTIVE');
    });

    it('AC-06: creates a product without brand (optional brand)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Generic Plain Canvas Shoes',
          categoryId: leafCategoryId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.brandId).toBeNull();
      secondProductId = res.body.data.product.id;
    });

    it('AC-12: auto-assigns primary image when no image is marked primary', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Casual Slip-on Shoes',
          categoryId: leafCategoryId,
          images: [{ url: 'https://example.com/slipon.jpg', isPrimary: false }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.images[0].isPrimary).toBe(true);
    });
  });

  describe('2. Product Administration List, Detail, and Update', () => {
    it('AC-10 & AC-11: lists admin products with pagination, search, and filters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products?search=air max&status=DRAFT&featured=true')
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].name).toBe('Nike Air Max 270');
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('AC-09: updates product details and preserves slug when name changes', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Nike Air Max 270 Special Edition',
          shortDescription: 'Updated short description for Air Max',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe('Nike Air Max 270 Special Edition');
      expect(res.body.data.product.slug).toBe('nike-air-max-270'); // Slug unchanged
      expect(res.body.data.product.shortDescription).toBe('Updated short description for Air Max');
    });
  });

  describe('3. Variant CRUD & Signature Uniqueness Engine', () => {
    it('AC-15 & AC-18: creates a variant with price in minor units', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/variants`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          sku: 'NK-AM270-BLK-9',
          name: 'Black / Size 9',
          attributes: [
            { name: 'Color', value: 'Black' },
            { name: 'Size', value: '9' },
          ],
          price: 1850000, // 18,500.00 PKR in paisa
          compareAtPrice: 2000000, // 20,000.00 PKR
          costPrice: 1200000, // 12,000.00 PKR (internal only)
          barcode: '888462019284',
          weightGrams: 450,
          dimensions: { lengthCm: 32, widthCm: 22, heightCm: 12 },
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.variant.sku).toBe('NK-AM270-BLK-9');
      expect(res.body.data.variant.price).toBe(1850000);
      expect(res.body.data.variant.compareAtPrice).toBe(2000000);
      expect(res.body.data.variant.costPrice).toBe(1200000);

      testVariantId = res.body.data.variant.id;
    });

    it('AC-16: rejects duplicate SKU with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/variants`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          sku: 'nk-am270-blk-9', // Case-insensitive duplicate test
          attributes: [
            { name: 'Color', value: 'White' },
            { name: 'Size', value: '10' },
          ],
          price: 1850000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_VARIANT_SKU_EXISTS');
    });

    it('AC-17: rejects duplicate variant attribute combination even with reversed order', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/variants`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          sku: 'NK-AM270-BLK-9-DIFFSKU',
          attributes: [
            { name: 'Size', value: '9' }, // Order reversed: Size first, then Color
            { name: 'Color', value: 'Black' },
          ],
          price: 1850000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_VARIANT_DUPLICATE_ATTRIBUTES');
    });

    it('AC-18: rejects compareAtPrice lower than selling price', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/variants`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          sku: 'NK-AM270-WHT-9',
          attributes: [
            { name: 'Color', value: 'White' },
            { name: 'Size', value: '9' },
          ],
          price: 1850000,
          compareAtPrice: 1500000, // Invalid: lower than price
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates a second distinct variant under the same product', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/products/${testProductId}/variants`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          sku: 'NK-AM270-WHT-9',
          name: 'White / Size 9',
          attributes: [
            { name: 'Color', value: 'White' },
            { name: 'Size', value: '9' },
          ],
          price: 1950000,
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.variant.sku).toBe('NK-AM270-WHT-9');
    });

    it('AC-19: lists and updates variant details', async () => {
      const listRes = await request(app)
        .get(`/api/v1/admin/products/${testProductId}/variants`)
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.variants.length).toBe(2);

      const updateRes = await request(app)
        .patch(`/api/v1/admin/products/${testProductId}/variants/${testVariantId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          price: 1890000,
          barcode: '123456789012',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.variant.price).toBe(1890000);
      expect(updateRes.body.data.variant.barcode).toBe('123456789012');
    });
  });

  describe('4. IDOR & Product-Variant Ownership Security', () => {
    it('PRODUCT-SEC-05 & AC-21: accessing Variant of Product A via Product B returns 404', async () => {
      // Attempt to access testVariantId (belongs to testProductId) under secondProductId
      const getRes = await request(app)
        .get(`/api/v1/admin/products/${secondProductId}/variants/${testVariantId}`)
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe('ERR_VARIANT_NOT_FOUND');

      const patchRes = await request(app)
        .patch(`/api/v1/admin/products/${secondProductId}/variants/${testVariantId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ price: 100 });

      expect(patchRes.status).toBe(404);

      const delRes = await request(app)
        .delete(`/api/v1/admin/products/${secondProductId}/variants/${testVariantId}`)
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(delRes.status).toBe(404);
    });
  });

  describe('5. Publishing Workflow & Active Variant Integrity', () => {
    it('AC-22: cannot publish product without any active variants', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${secondProductId}/status`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_PRODUCT_REQUIRES_ACTIVE_VARIANT');
    });

    it('AC-23 & AC-24: successfully publishes product when active variant exists, sets publishedAt', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.product.status).toBe('ACTIVE');
      expect(res.body.data.product.publishedAt).toBeDefined();
    });

    it('AC-22: cannot delete or deactivate the last active variant of an ACTIVE product', async () => {
      // Create a temporary single-variant product and publish it
      const prodRes = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ name: 'Single Variant Prod', categoryId: leafCategoryId });
      const singleProdId = prodRes.body.data.product.id;

      const varRes = await request(app)
        .post(`/api/v1/admin/products/${singleProdId}/variants`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ sku: 'SINGLE-VAR-SKU', price: 500000 });
      const singleVarId = varRes.body.data.variant.id;

      await request(app)
        .patch(`/api/v1/admin/products/${singleProdId}/status`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ status: 'ACTIVE' });

      // Attempt to deactivate the only active variant
      const deactRes = await request(app)
        .patch(`/api/v1/admin/products/${singleProdId}/variants/${singleVarId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ isActive: false });

      expect(deactRes.status).toBe(400);
      expect(deactRes.body.error.code).toBe('ERR_PRODUCT_REQUIRES_ACTIVE_VARIANT');

      // Attempt to delete the only active variant
      const delRes = await request(app)
        .delete(`/api/v1/admin/products/${singleProdId}/variants/${singleVarId}`)
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(delRes.status).toBe(400);
      expect(delRes.body.error.code).toBe('ERR_PRODUCT_REQUIRES_ACTIVE_VARIANT');
    });
  });

  describe('6. Public Products API & Visibility Engine', () => {
    it('AC-26 & AC-33: public list returns only active products with computed price range', async () => {
      const res = await request(app).get('/api/v1/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);

      const airMax = res.body.data.products.find((p: { slug: string }) => p.slug === 'nike-air-max-270');
      expect(airMax).toBeDefined();
      expect(airMax.priceRange).toBeDefined();
      expect(airMax.priceRange.currency).toBe('PKR');
      expect(airMax.priceRange.min).toBe(1890000);
      expect(airMax.priceRange.max).toBe(1950000);
    });

    it('AC-27, AC-28, AC-29 & PRODUCT-SEC-06: public product detail returns active variants and hides costPrice', async () => {
      const res = await request(app).get('/api/v1/products/nike-air-max-270');

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe('Nike Air Max 270 Special Edition');
      expect(res.body.data.product.variants.length).toBe(2);

      // Verify no sensitive fields leak
      expect(res.body.data.product.createdBy).toBeUndefined();
      expect(res.body.data.product.updatedBy).toBeUndefined();
      expect(res.body.data.product.variants[0].costPrice).toBeUndefined();
      expect(res.body.data.product.variants[0].attributeSignature).toBeUndefined();
    });

    it('AC-30 & PRODUCT-SEC-09: product is hidden publicly if its category is deactivated', async () => {
      // Deactivate Sneakers leaf category
      await request(app)
        .patch(`/api/v1/admin/categories/${leafCategoryId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ isActive: false });

      const listRes = await request(app).get('/api/v1/products');
      const airMaxInList = listRes.body.data.products.find((p: { slug: string }) => p.slug === 'nike-air-max-270');
      expect(airMaxInList).toBeUndefined();

      const detailRes = await request(app).get('/api/v1/products/nike-air-max-270');
      expect(detailRes.status).toBe(404);

      // Re-activate category for following tests
      await request(app)
        .patch(`/api/v1/admin/categories/${leafCategoryId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ isActive: true });
    });

    it('AC-31: product is hidden publicly if its brand is deactivated', async () => {
      // Deactivate Nike brand
      await request(app)
        .patch(`/api/v1/admin/brands/${activeBrandId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ isActive: false });

      const detailRes = await request(app).get('/api/v1/products/nike-air-max-270');
      expect(detailRes.status).toBe(404);

      // Re-activate brand
      await request(app)
        .patch(`/api/v1/admin/brands/${activeBrandId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({ isActive: true });
    });
  });

  describe('7. Category & Brand Delete Protection Guards', () => {
    it('AC-34: category referenced by active products cannot be deleted (409 Conflict)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/categories/${leafCategoryId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_CATEGORY_IN_USE');
    });

    it('AC-35: brand referenced by active products cannot be deleted (409 Conflict)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/brands/${activeBrandId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_BRAND_IN_USE');
    });
  });

  describe('8. Security & RBAC Enforcement on Products', () => {
    it('PRODUCT-SEC-01 & AC-39: CUSTOMER cannot access admin product creation (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Hacked Product', categoryId: leafCategoryId });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_PERMISSION_REQUIRED');
    });

    it('PRODUCT-SEC-02 & AC-38: ORDER_MANAGER cannot edit products (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({ name: 'OM Illegal Update' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_PERMISSION_REQUIRED');
    });

    it('PRODUCT-SEC-03 & AC-37: INVENTORY_MANAGER can read products but cannot update/create (403 Forbidden)', async () => {
      // Can read list
      const getListRes = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${inventoryManagerToken}`);
      expect(getListRes.status).toBe(200);

      // Cannot update
      const patchRes = await request(app)
        .patch(`/api/v1/admin/products/${testProductId}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({ name: 'IM Illegal Update' });
      expect(patchRes.status).toBe(403);
    });

    it('PRODUCT-SEC-04 & AC-36 & AC-40: SUPER_ADMIN and PRODUCT_MANAGER have full permissions', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/admin/products/${secondProductId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });

    it('PRODUCT-SEC-10 & AC-46: Invalid Mongo ObjectIds return 400 Bad Request, not 500 error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products/invalid-id')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);

      const resVar = await request(app)
        .get(`/api/v1/admin/products/${testProductId}/variants/invalid-var-id`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resVar.status).toBe(400);
    });
  });
});
