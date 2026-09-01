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

describe('Module 07: Product Search & Filtering Test Suite', () => {
  let adminToken: string;

  let electronicsRootCatId: string;
  let phonesMidCatId: string;
  let smartphonesLeafCatId: string;
  let laptopsLeafCatId: string;
  let inactiveCatId: string;

  let appleBrandId: string;
  let samsungBrandId: string;
  let inactiveBrandId: string;

  let iphoneProdId: string;
  let galaxyProdId: string;
  let macbookProdId: string;
  let draftProdId: string;
  let inactiveProdId: string;
  let archivedProdId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    // Clean test data
    await User.deleteMany({ email: 'search.admin@test.com' });
    await ProductVariant.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});

    // 1. Setup SUPER_ADMIN
    const regRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Search',
      lastName: 'Admin',
      email: 'search.admin@test.com',
      password: 'Password123!',
    });
    await User.findByIdAndUpdate(regRes.body.data.user.id, {
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
    });
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'search.admin@test.com',
      password: 'Password123!',
    });
    adminToken = loginRes.body.data.accessToken;

    // 2. Setup 3-Level Category Hierarchy
    // Electronics (Root) -> Phones (Mid) -> Smartphones (Leaf)
    // Electronics (Root) -> Laptops (Leaf)
    const elecRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', slug: 'electronics' });
    electronicsRootCatId = elecRes.body.data.category.id;

    const phonesRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Phones', slug: 'phones', parentId: electronicsRootCatId });
    phonesMidCatId = phonesRes.body.data.category.id;

    const smartRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Smartphones', slug: 'smartphones', parentId: phonesMidCatId });
    smartphonesLeafCatId = smartRes.body.data.category.id;

    const lapRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Laptops', slug: 'laptops', parentId: electronicsRootCatId });
    laptopsLeafCatId = lapRes.body.data.category.id;

    const inactCatRes = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Old Gadgets', slug: 'old-gadgets', isActive: false });
    inactiveCatId = inactCatRes.body.data.category.id;

    // 3. Setup Brands
    const appleRes = await request(app)
      .post('/api/v1/admin/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Apple', slug: 'apple' });
    appleBrandId = appleRes.body.data.brand.id;

    const samRes = await request(app)
      .post('/api/v1/admin/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Samsung', slug: 'samsung' });
    samsungBrandId = samRes.body.data.brand.id;

    const inactBrandRes = await request(app)
      .post('/api/v1/admin/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nokia Legacy', slug: 'nokia-legacy', isActive: false });
    inactiveBrandId = inactBrandRes.body.data.brand.id;

    // 4. Setup Products
    // Product 1: iPhone 16 Pro (Active, Apple, Smartphones, Featured)
    const ipRes = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'iPhone 16 Pro Max',
        slug: 'iphone-16-pro-max',
        shortDescription: 'Flagship Apple smartphone with titanium finish and A18 Pro chip',
        description: 'The definitive smartphone from Apple.',
        categoryId: smartphonesLeafCatId,
        brandId: appleBrandId,
        featured: true,
        tags: ['apple', 'iphone', 'flagship', '5g', 'titanium'],
        attributes: [
          { name: 'Processor', value: 'A18 Pro' },
          { name: 'Material', value: 'Titanium' },
        ],
        images: [{ url: 'https://example.com/iphone16.jpg', isPrimary: true }],
      });
    iphoneProdId = ipRes.body.data.product.id;

    // iPhone Variants:
    // Var 1: Black / 128GB (Price: 300,000 PKR = 30,000,000 minor units)
    await request(app)
      .post(`/api/v1/admin/products/${iphoneProdId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'IPH-16-BLK-128',
        name: 'Black Titanium / 128GB',
        attributes: [
          { name: 'Color', value: 'Black' },
          { name: 'Storage', value: '128GB' },
        ],
        price: 30000000,
        costPrice: 24000000,
      });

    // Var 2: Black / 256GB (Price: 350,000 PKR = 35,000,000 minor units)
    await request(app)
      .post(`/api/v1/admin/products/${iphoneProdId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'IPH-16-BLK-256',
        name: 'Black Titanium / 256GB',
        attributes: [
          { name: 'Color', value: 'Black' },
          { name: 'Storage', value: '256GB' },
        ],
        price: 35000000,
        costPrice: 28000000,
      });

    // Var 3: White / 128GB (Price: 300,000 PKR = 30,000,000 minor units)
    await request(app)
      .post(`/api/v1/admin/products/${iphoneProdId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'IPH-16-WHT-128',
        name: 'White Titanium / 128GB',
        attributes: [
          { name: 'Color', value: 'White' },
          { name: 'Storage', value: '128GB' },
        ],
        price: 30000000,
      });

    // Publish iPhone
    await request(app)
      .patch(`/api/v1/admin/products/${iphoneProdId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    // Product 2: Galaxy S24 Ultra (Active, Samsung, Smartphones)
    const gxRes = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Samsung Galaxy S24 Ultra',
        slug: 'samsung-galaxy-s24-ultra',
        shortDescription: 'Galaxy AI smartphone with S-Pen',
        categoryId: smartphonesLeafCatId,
        brandId: samsungBrandId,
        featured: false,
        tags: ['samsung', 'galaxy', 'ai', 'spen', 'android'],
        attributes: [
          { name: 'Processor', value: 'Snapdragon 8 Gen 3' },
          { name: 'Material', value: 'Titanium' },
        ],
      });
    galaxyProdId = gxRes.body.data.product.id;

    // Galaxy Variant: Grey / 256GB (Price: 280,000 PKR = 28,000,000 minor units)
    await request(app)
      .post(`/api/v1/admin/products/${galaxyProdId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'SAM-S24-GRY-256',
        name: 'Titanium Grey / 256GB',
        attributes: [
          { name: 'Color', value: 'Grey' },
          { name: 'Storage', value: '256GB' },
        ],
        price: 28000000,
      });

    // Publish Galaxy
    await request(app)
      .patch(`/api/v1/admin/products/${galaxyProdId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    // Product 3: MacBook Pro 16 (Active, Apple, Laptops)
    const mbRes = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'MacBook Pro 16 M3 Max',
        slug: 'macbook-pro-16-m3-max',
        shortDescription: 'High performance creator workstation laptop',
        categoryId: laptopsLeafCatId,
        brandId: appleBrandId,
        featured: true,
        tags: ['apple', 'macbook', 'laptop', 'm3'],
        attributes: [
          { name: 'Processor', value: 'M3 Max' },
          { name: 'Material', value: 'Aluminum' },
        ],
      });
    macbookProdId = mbRes.body.data.product.id;

    // MacBook Variant: Space Black / 36GB (Price: 650,000 PKR = 65,000,000 minor units)
    await request(app)
      .post(`/api/v1/admin/products/${macbookProdId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'MBP-16-BLK-36',
        name: 'Space Black / 36GB',
        attributes: [
          { name: 'Color', value: 'Space Black' },
          { name: 'RAM', value: '36GB' },
        ],
        price: 65000000,
      });

    // Publish MacBook
    await request(app)
      .patch(`/api/v1/admin/products/${macbookProdId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    // Product 4: Draft Product (Hidden)
    const dRes = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Draft Secret Device', categoryId: smartphonesLeafCatId });
    draftProdId = dRes.body.data.product.id;
    await request(app)
      .post(`/api/v1/admin/products/${draftProdId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'DRAFT-DEV-01', price: 100000 });

    // Product 5: Inactive Product (Hidden)
    const inactRes = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Inactive Discontinued Phone', categoryId: smartphonesLeafCatId });
    inactiveProdId = inactRes.body.data.product.id;
    await request(app)
      .post(`/api/v1/admin/products/${inactiveProdId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'INACT-DEV-01', price: 100000 });
    await request(app)
      .patch(`/api/v1/admin/products/${inactiveProdId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    // Product 6: Archived Product (Hidden)
    const archRes = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Archived Antique Phone', categoryId: smartphonesLeafCatId });
    archivedProdId = archRes.body.data.product.id;
    await request(app)
      .post(`/api/v1/admin/products/${archivedProdId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'ARCH-DEV-01', price: 100000 });
    await request(app)
      .patch(`/api/v1/admin/products/${archivedProdId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ARCHIVED' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'search.admin@test.com' });
    await ProductVariant.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await mongoose.disconnect();
  });

  describe('1. Public Keyword Search (AC-01, AC-02, AC-03, AC-04)', () => {
    it('AC-01 & AC-03: searches by product name', async () => {
      const res = await request(app).get('/api/v1/products?search=iPhone');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].name).toBe('iPhone 16 Pro Max');
    });

    it('AC-04: searches by product tag', async () => {
      const res = await request(app).get('/api/v1/products?search=titanium');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].slug).toBe('iphone-16-pro-max');
    });

    it('AC-02 & SEARCH-SEC-01: handles special regex characters safely without injecting syntax', async () => {
      const res = await request(app).get('/api/v1/products?search=iPhone.*(16)');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toEqual([]); // Safely escaped, no match
    });

    it('returns all active products when search query is empty', async () => {
      const res = await request(app).get('/api/v1/products?search=');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(3); // iPhone, Galaxy, MacBook
    });
  });

  describe('2. Category Hierarchy & Descendant Filtering (AC-05, AC-06)', () => {
    it('AC-05: filters by leaf category slug directly', async () => {
      const res = await request(app).get('/api/v1/products?category=smartphones');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2);
      const slugs = res.body.data.products.map((p: any) => p.slug);
      expect(slugs).toContain('iphone-16-pro-max');
      expect(slugs).toContain('samsung-galaxy-s24-ultra');
    });

    it('AC-06: filtering by mid-level category (Phones) includes descendant products', async () => {
      const res = await request(app).get('/api/v1/products?category=phones');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2);
      const slugs = res.body.data.products.map((p: any) => p.slug);
      expect(slugs).toContain('iphone-16-pro-max');
      expect(slugs).toContain('samsung-galaxy-s24-ultra');
    });

    it('AC-06: filtering by root category (Electronics) includes all descendant products', async () => {
      const res = await request(app).get('/api/v1/products?category=electronics');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(3); // Smartphones + Laptops
    });

    it('returns empty array when category is inactive', async () => {
      const res = await request(app).get('/api/v1/products?category=old-gadgets');

      expect(res.status).toBe(200);
      expect(res.body.data.products).toEqual([]);
    });
  });

  describe('3. Brand Filtering (AC-07, AC-08)', () => {
    it('AC-07: filters by single brand slug', async () => {
      const res = await request(app).get('/api/v1/products?brand=apple');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2); // iPhone + MacBook
      const slugs = res.body.data.products.map((p: any) => p.slug);
      expect(slugs).toContain('iphone-16-pro-max');
      expect(slugs).toContain('macbook-pro-16-m3-max');
    });

    it('AC-08: filters by multiple comma-separated brands with OR semantics', async () => {
      const res = await request(app).get('/api/v1/products?brand=apple,samsung');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(3); // Apple + Samsung
    });

    it('returns empty array when requested brand is inactive', async () => {
      const res = await request(app).get('/api/v1/products?brand=nokia-legacy');

      expect(res.status).toBe(200);
      expect(res.body.data.products).toEqual([]);
    });
  });

  describe('4. Price Range Filtering (AC-09, AC-10, AC-11)', () => {
    it('AC-09 & AC-10 & AC-11: matches product when at least one active variant falls in range', async () => {
      // iPhone variants: 30,000,000 & 35,000,000. Galaxy: 28,000,000. MacBook: 65,000,000
      // Filter 29M to 32M -> should match iPhone only
      const res = await request(app).get(
        '/api/v1/products?minPrice=29000000&maxPrice=32000000'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].slug).toBe('iphone-16-pro-max');
    });

    it('filters out products where all variant prices are outside the requested range', async () => {
      const res = await request(app).get('/api/v1/products?minPrice=70000000');

      expect(res.status).toBe(200);
      expect(res.body.data.products).toEqual([]);
    });

    it('AC-36: returns 400 Bad Request when minPrice > maxPrice', async () => {
      const res = await request(app).get(
        '/api/v1/products?minPrice=50000000&maxPrice=20000000'
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('5. Variant Attribute & Same-Variant Combination (AC-12 to AC-15)', () => {
    it('AC-12: matches single attribute filter', async () => {
      const res = await request(app).get('/api/v1/products?attribute=color:grey');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].slug).toBe('samsung-galaxy-s24-ultra');
    });

    it('AC-13 & AC-15: matches when one single variant satisfies multiple attribute filters (Black + 256GB)', async () => {
      const res = await request(app).get(
        '/api/v1/products?attribute=color:black&attribute=storage:256gb'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].slug).toBe('iphone-16-pro-max');
    });

    it('AC-15: DOES NOT MATCH when no single variant satisfies the combination (White + 256GB)', async () => {
      // iPhone has White/128GB and Black/256GB, but NO White/256GB
      const res = await request(app).get(
        '/api/v1/products?attribute=color:white&attribute=storage:256gb'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.products).toEqual([]);
    });

    it('AC-14: multiple values for the same attribute use OR semantics', async () => {
      // Color = White OR Grey
      const res = await request(app).get(
        '/api/v1/products?attribute=color:white&attribute=color:grey'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2); // iPhone (has White) & Galaxy (has Grey)
    });
  });

  describe('6. Specification Filtering & Featured Filter (AC-16, AC-17)', () => {
    it('AC-16: filters by product specification attribute', async () => {
      const res = await request(app).get('/api/v1/products?spec=processor:m3 max');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].slug).toBe('macbook-pro-16-m3-max');
    });

    it('AC-17: filters featured products', async () => {
      const res = await request(app).get('/api/v1/products?featured=true');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2); // iPhone and MacBook are featured
      const slugs = res.body.data.products.map((p: any) => p.slug);
      expect(slugs).toContain('iphone-16-pro-max');
      expect(slugs).toContain('macbook-pro-16-m3-max');
    });
  });

  describe('7. Sorting & Pagination (AC-18 to AC-25)', () => {
    it('AC-22: sorts by price: low to high (price-asc)', async () => {
      const res = await request(app).get('/api/v1/products?sort=price-asc');

      expect(res.status).toBe(200);
      const prices = res.body.data.products.map((p: any) => p.priceRange.min);
      expect(prices[0]).toBe(28000000); // Galaxy: 28M
      expect(prices[1]).toBe(30000000); // iPhone: 30M
      expect(prices[2]).toBe(65000000); // MacBook: 65M
    });

    it('AC-23: sorts by price: high to low (price-desc)', async () => {
      const res = await request(app).get('/api/v1/products?sort=price-desc');

      expect(res.status).toBe(200);
      const prices = res.body.data.products.map((p: any) => p.priceRange.min);
      expect(prices[0]).toBe(65000000); // MacBook
      expect(prices[1]).toBe(30000000); // iPhone
      expect(prices[2]).toBe(28000000); // Galaxy
    });

    it('AC-20: sorts by name: A to Z (name-asc)', async () => {
      const res = await request(app).get('/api/v1/products?sort=name-asc');

      expect(res.status).toBe(200);
      const names = res.body.data.products.map((p: any) => p.name);
      expect(names[0]).toBe('iPhone 16 Pro Max');
      expect(names[1]).toBe('MacBook Pro 16 M3 Max');
      expect(names[2]).toBe('Samsung Galaxy S24 Ultra');
    });

    it('AC-24 & AC-25: paginates results with comprehensive metadata', async () => {
      const res = await request(app).get('/api/v1/products?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(2);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });

      const page2Res = await request(app).get('/api/v1/products?page=2&limit=2');
      expect(page2Res.body.data.products.length).toBe(1);
      expect(page2Res.body.data.pagination.hasNextPage).toBe(false);
      expect(page2Res.body.data.pagination.hasPreviousPage).toBe(true);
    });
  });

  describe('8. Faceted Search Metadata Endpoint (AC-26 to AC-31)', () => {
    it('AC-26, AC-27, AC-28, AC-29, AC-30: computes accurate facet counts for categories, brands, variants, and prices', async () => {
      const res = await request(app).get('/api/v1/products/facets');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { categories, brands, variantAttributes, price } = res.body.data;

      // Category facets
      const smartCat = categories.find((c: any) => c.slug === 'smartphones');
      expect(smartCat).toBeDefined();
      expect(smartCat.count).toBe(2);

      const lapCat = categories.find((c: any) => c.slug === 'laptops');
      expect(lapCat).toBeDefined();
      expect(lapCat.count).toBe(1);

      // Brand facets
      const appleBrand = brands.find((b: any) => b.slug === 'apple');
      expect(appleBrand).toBeDefined();
      expect(appleBrand.count).toBe(2);

      const samBrand = brands.find((b: any) => b.slug === 'samsung');
      expect(samBrand).toBeDefined();
      expect(samBrand.count).toBe(1);

      // Variant attribute facets
      const colorFacet = variantAttributes.find((a: any) => a.name === 'Color');
      expect(colorFacet).toBeDefined();
      const blackCount = colorFacet.values.find((v: any) => v.value === 'Black');
      expect(blackCount.count).toBe(2);

      // Price facet
      expect(price.min).toBe(28000000);
      expect(price.max).toBe(65000000);
      expect(price.currency).toBe('PKR');
    });

    it('computes contextual facets when filtered by category', async () => {
      const res = await request(app).get('/api/v1/products/facets?category=smartphones');

      expect(res.status).toBe(200);
      const { brands, price } = res.body.data;

      // Only Apple (1) and Samsung (1) in smartphones
      const appleBrand = brands.find((b: any) => b.slug === 'apple');
      expect(appleBrand.count).toBe(1);

      expect(price.max).toBe(35000000); // Max smartphone price is 35M
    });
  });

  describe('9. Public DTO & Search Security Criteria (SEARCH-SEC-01 to 10)', () => {
    it('SEARCH-SEC-03, 04, 05: DRAFT, INACTIVE, and ARCHIVED products never appear publicly', async () => {
      const res = await request(app).get('/api/v1/products');

      const slugs = res.body.data.products.map((p: any) => p.slug);
      expect(slugs).not.toContain('draft-secret-device');
      expect(slugs).not.toContain('inactive-discontinued-phone');
      expect(slugs).not.toContain('archived-antique-phone');
    });

    it('SEARCH-SEC-09 & AC-34: public product cards never leak costPrice, createdBy, updatedBy, or attributeSignature', async () => {
      const res = await request(app).get('/api/v1/products');

      for (const p of res.body.data.products) {
        expect(p.costPrice).toBeUndefined();
        expect(p.createdBy).toBeUndefined();
        expect(p.updatedBy).toBeUndefined();
        expect(p.attributeSignature).toBeUndefined();
      }
    });

    it('SEARCH-SEC-10 & AC-35: rejects query abuse (excessive limits, negative prices, excessive attributes)', async () => {
      const resLimit = await request(app).get('/api/v1/products?limit=500');
      expect(resLimit.status).toBe(400);

      const resNegativePrice = await request(app).get('/api/v1/products?minPrice=-100');
      expect(resNegativePrice.status).toBe(400);

      const resInvalidSort = await request(app).get('/api/v1/products?sort=hacked-column');
      expect(resInvalidSort.status).toBe(400);
    });
  });
});
