import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { Category } from '../src/modules/catalog/categories/category.model.js';
import { Brand } from '../src/modules/catalog/brands/brand.model.js';
import { ROLES } from '../src/modules/authorization/roles.js';

const app = createApp();

describe('Module 05: Categories & Brands (Catalog) Test Suite', () => {
  let superAdminToken: string;
  let productManagerToken: string;
  let orderManagerToken: string;
  let customerSupportToken: string;
  let customerToken: string;

  let rootCatId: string;
  let level2CatId: string;
  let level3CatId: string;
  let testBrandId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    // Clean test data
    await User.deleteMany({
      email: {
        $in: [
          'catalog.super@test.com',
          'catalog.pm@test.com',
          'catalog.om@test.com',
          'catalog.support@test.com',
          'catalog.cust@test.com',
        ],
      },
    });
    await Category.deleteMany({});
    await Brand.deleteMany({});

    // 1. Setup SUPER_ADMIN
    const regSuper = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'catalog.super@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regSuper.body.data.user.id, {
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
    });
    const loginSuper = await request(app).post('/api/v1/auth/login').send({
      email: 'catalog.super@test.com',
      password: 'Password123!',
    });
    superAdminToken = loginSuper.body.data.accessToken;

    // 2. Setup PRODUCT_MANAGER
    const regPM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Product',
      lastName: 'Manager',
      email: 'catalog.pm@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regPM.body.data.user.id, {
      role: ROLES.PRODUCT_MANAGER,
      isEmailVerified: true,
    });
    const loginPM = await request(app).post('/api/v1/auth/login').send({
      email: 'catalog.pm@test.com',
      password: 'Password123!',
    });
    productManagerToken = loginPM.body.data.accessToken;

    // 3. Setup ORDER_MANAGER
    const regOM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Order',
      lastName: 'Manager',
      email: 'catalog.om@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regOM.body.data.user.id, {
      role: ROLES.ORDER_MANAGER,
      isEmailVerified: true,
    });
    const loginOM = await request(app).post('/api/v1/auth/login').send({
      email: 'catalog.om@test.com',
      password: 'Password123!',
    });
    orderManagerToken = loginOM.body.data.accessToken;

    // 4. Setup CUSTOMER_SUPPORT
    const regSupport = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Customer',
      lastName: 'Support',
      email: 'catalog.support@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regSupport.body.data.user.id, {
      role: ROLES.CUSTOMER_SUPPORT,
      isEmailVerified: true,
    });
    const loginSupport = await request(app).post('/api/v1/auth/login').send({
      email: 'catalog.support@test.com',
      password: 'Password123!',
    });
    customerSupportToken = loginSupport.body.data.accessToken;

    // 5. Setup CUSTOMER
    await request(app).post('/api/v1/auth/register').send({
      firstName: 'Normal',
      lastName: 'Customer',
      email: 'catalog.cust@test.com',
      password: 'Password123!',
    });
    const loginCust = await request(app).post('/api/v1/auth/login').send({
      email: 'catalog.cust@test.com',
      password: 'Password123!',
    });
    customerToken = loginCust.body.data.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          'catalog.super@test.com',
          'catalog.pm@test.com',
          'catalog.om@test.com',
          'catalog.support@test.com',
          'catalog.cust@test.com',
        ],
      },
    });
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await mongoose.disconnect();
  });

  describe('1. Category Hierarchy & Max Depth Validation', () => {
    it('AC-06: creates a root category (Level 1)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Electronics',
          description: 'All electronic gadgets and computers',
          sortOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Electronics');
      expect(res.body.data.category.slug).toBe('electronics');
      expect(res.body.data.category.parentId).toBeNull();
      rootCatId = res.body.data.category.id;
    });

    it('AC-07: creates a child category (Level 2)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Computers & Tablets',
          parentId: rootCatId,
          sortOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.category.name).toBe('Computers & Tablets');
      expect(res.body.data.category.slug).toBe('computers-tablets');
      expect(res.body.data.category.parentId).toBe(rootCatId);
      level2CatId = res.body.data.category.id;
    });

    it('AC-08: creates a third-level subcategory (Level 3)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Laptops',
          parentId: level2CatId,
          sortOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.category.name).toBe('Laptops');
      expect(res.body.data.category.slug).toBe('laptops');
      expect(res.body.data.category.parentId).toBe(level2CatId);
      level3CatId = res.body.data.category.id;
    });

    it('AC-09: rejects creating a fourth-level subcategory (exceeding MAX_DEPTH of 3)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Gaming Laptops',
          parentId: level3CatId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_CATEGORY_MAX_DEPTH');
    });

    it('AC-12: rejects creating category with non-existent parentId', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Dangling Subcategory',
          parentId: fakeId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_PARENT_CATEGORY_NOT_FOUND');
    });

    it('AC-03: rejects duplicate category slug with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Electronics Duplicate',
          slug: 'electronics', // Already taken by root category
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_CATEGORY_SLUG_EXISTS');
    });
  });

  describe('2. Category Cycle Detection & Self-Parenting', () => {
    it('AC-10: rejects setting category as its own parent', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/categories/${rootCatId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          parentId: rootCatId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_CATEGORY_SELF_PARENT');
    });

    it('AC-11 & CATALOG-SEC-06: rejects circular hierarchy (making root parented by its descendant)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/categories/${rootCatId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          parentId: level3CatId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_CATEGORY_CYCLE');
    });
  });

  describe('3. Category Admin CRUD & Deletion Protection', () => {
    it('AC-15 & AC-16: lists categories with pagination, search, and sorting', async () => {
      const res = await request(app)
        .get('/api/v1/admin/categories?page=1&limit=10&search=laptop')
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categories.length).toBe(1);
      expect(res.body.data.categories[0].name).toBe('Laptops');
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('AC-13: updates category details', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/categories/${level3CatId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          description: 'High performance portable computers',
          sortOrder: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.category.description).toBe('High performance portable computers');
      expect(res.body.data.category.sortOrder).toBe(5);
    });

    it('AC-19: rejects deleting a category that has children with 409 Conflict', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/categories/${rootCatId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_CATEGORY_HAS_CHILDREN');
    });

    it('PRODUCT_MANAGER cannot delete category (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/categories/${level3CatId}`)
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(res.status).toBe(403);
    });

    it('AC-13: deletes a leaf category successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/categories/${level3CatId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Category.findById(level3CatId);
      expect(check).toBeNull();
    });
  });

  describe('4. Public Category Endpoints & Tree Builder', () => {
    beforeAll(async () => {
      // Re-create a subcategory and an inactive category for testing
      await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Mobile Phones',
          parentId: rootCatId,
          isActive: true,
          sortOrder: 2,
        });

      await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Hidden Inactive Category',
          slug: 'hidden-inactive',
          isActive: false,
        });
    });

    it('AC-22 & CATALOG-SEC-08: public list returns only active categories', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const names = res.body.data.categories.map((c: { name: string }) => c.name);
      expect(names).toContain('Electronics');
      expect(names).toContain('Mobile Phones');
      expect(names).not.toContain('Hidden Inactive Category');
    });

    it('AC-23: public category tree builds valid hierarchical nested structure', async () => {
      const res = await request(app).get('/api/v1/categories/tree');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.tree)).toBe(true);

      const electronicsTree = res.body.data.tree.find((t: { slug: string }) => t.slug === 'electronics');
      expect(electronicsTree).toBeDefined();
      expect(electronicsTree.children.length).toBeGreaterThanOrEqual(1);
    });

    it('AC-24: fetches public category by slug and strips internal admin metadata', async () => {
      const res = await request(app).get('/api/v1/categories/electronics');
      expect(res.status).toBe(200);
      expect(res.body.data.category.slug).toBe('electronics');
      expect(res.body.data.category.createdBy).toBeUndefined();
      expect(res.body.data.category.updatedBy).toBeUndefined();
    });

    it('AC-24: returns 404 for inactive category slug', async () => {
      const res = await request(app).get('/api/v1/categories/hidden-inactive');
      expect(res.status).toBe(404);
    });
  });

  describe('5. Brand Management & Case-Insensitive Uniqueness', () => {
    it('AC-02 & AC-14: creates a brand with auto-generated slug', async () => {
      const res = await request(app)
        .post('/api/v1/admin/brands')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Samsung',
          description: 'Global electronics powerhouse',
          websiteUrl: 'https://www.samsung.com',
          sortOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.brand.name).toBe('Samsung');
      expect(res.body.data.brand.slug).toBe('samsung');
      testBrandId = res.body.data.brand.id;
    });

    it('AC-05: rejects duplicate brand name case-insensitively with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/brands')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'samsung', // Lowercase variant
          description: 'Duplicate brand attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_BRAND_NAME_EXISTS');
    });

    it('AC-04: rejects duplicate brand slug with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/brands')
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          name: 'Samsung Electronics Co',
          slug: 'samsung', // Taken slug
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_BRAND_SLUG_EXISTS');
    });

    it('AC-17 & AC-18: lists admin brands with search, filter, and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/brands?search=samsung')
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.brands.length).toBe(1);
      expect(res.body.data.brands[0].name).toBe('Samsung');
    });

    it('AC-14: updates brand details', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/brands/${testBrandId}`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          description: 'Updated description for Samsung Electronics',
          sortOrder: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.brand.description).toBe(
        'Updated description for Samsung Electronics'
      );
      expect(res.body.data.brand.sortOrder).toBe(2);
    });

    it('AC-25 & AC-26: public brand list and slug lookup work', async () => {
      const listRes = await request(app).get('/api/v1/brands');
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.brands.length).toBeGreaterThanOrEqual(1);

      const slugRes = await request(app).get('/api/v1/brands/samsung');
      expect(slugRes.status).toBe(200);
      expect(slugRes.body.data.brand.name).toBe('Samsung');
      expect(slugRes.body.data.brand.createdBy).toBeUndefined();
    });

    it('AC-14: deletes brand successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/brands/${testBrandId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Brand.findById(testBrandId);
      expect(check).toBeNull();
    });
  });

  describe('6. Security & RBAC Enforcement on Catalog Endpoints', () => {
    it('CATALOG-SEC-01: CUSTOMER calling POST /api/v1/admin/categories receives 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Hacked Category',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_PERMISSION_REQUIRED');
    });

    it('CATALOG-SEC-02: ORDER_MANAGER cannot update categories (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/categories/${rootCatId}`)
        .set('Authorization', `Bearer ${orderManagerToken}`)
        .send({
          name: 'Illegal OM Update',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_PERMISSION_REQUIRED');
    });

    it('CATALOG-SEC-03: CUSTOMER_SUPPORT cannot delete brands (returns 403 Forbidden)', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/v1/admin/brands/${fakeId}`)
        .set('Authorization', `Bearer ${customerSupportToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_PERMISSION_REQUIRED');
    });

    it('CATALOG-SEC-04: SUPER_ADMIN has full permissions on category and brand management', async () => {
      const res = await request(app)
        .post('/api/v1/admin/brands')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Apple',
          description: 'Think Different',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.brand.name).toBe('Apple');
    });

    it('CATALOG-SEC-07: Invalid Mongo ObjectId params return 400 Bad Request, not 500 error', async () => {
      const resCat = await request(app)
        .get('/api/v1/admin/categories/invalid-mongo-id')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resCat.status).toBe(400);

      const resBrand = await request(app)
        .get('/api/v1/admin/brands/invalid-mongo-id')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resBrand.status).toBe(400);
    });
  });
});
