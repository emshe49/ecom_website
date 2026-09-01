import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
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
import {
  STOCK_STATUS,
  TRANSACTION_TYPE,
} from '../src/modules/inventory/inventory.constants.js';
import { ErrorCodes } from '../src/shared/errors/error-codes.js';
import { variantService } from '../src/modules/catalog/products/variant.service.js';
import { productService } from '../src/modules/catalog/products/product.service.js';

const app = createApp();

describe('Module 10: Inventory Management Test Suite', () => {
  let customerToken: string;
  let customerId: string;
  let inventoryManagerToken: string;
  let inventoryManagerId: string;
  let productManagerToken: string;
  let superAdminToken: string;
  let superAdminId: string;

  let activeCatId: string;
  let activeBrandId: string;
  let testProductId: string;
  let variant1Id: string;
  let variant2Id: string;
  let emptyVariantId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    // Clean test state
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
          'inv.cust@test.com',
          'inv.manager@test.com',
          'inv.pm@test.com',
          'inv.admin@test.com',
        ],
      },
    });

    // 1. Setup Customer
    const regCust = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Cust',
      lastName: 'User',
      email: 'inv.cust@test.com',
      password: 'Password123!',
    });
    customerId = regCust.body.data.user.id;
    await User.findByIdAndUpdate(customerId, { isEmailVerified: true });
    const loginCust = await request(app).post('/api/v1/auth/login').send({
      email: 'inv.cust@test.com',
      password: 'Password123!',
    });
    customerToken = loginCust.body.data.accessToken;

    // 2. Setup Inventory Manager
    const regIM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Inventory',
      lastName: 'Manager',
      email: 'inv.manager@test.com',
      password: 'Password123!',
    });
    inventoryManagerId = regIM.body.data.user.id;
    await User.findByIdAndUpdate(inventoryManagerId, {
      isEmailVerified: true,
      role: ROLES.INVENTORY_MANAGER,
    });
    const loginIM = await request(app).post('/api/v1/auth/login').send({
      email: 'inv.manager@test.com',
      password: 'Password123!',
    });
    inventoryManagerToken = loginIM.body.data.accessToken;

    // 3. Setup Product Manager
    const regPM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Product',
      lastName: 'Manager',
      email: 'inv.pm@test.com',
      password: 'Password123!',
    });
    const pmId = regPM.body.data.user.id;
    await User.findByIdAndUpdate(pmId, {
      isEmailVerified: true,
      role: ROLES.PRODUCT_MANAGER,
    });
    const loginPM = await request(app).post('/api/v1/auth/login').send({
      email: 'inv.pm@test.com',
      password: 'Password123!',
    });
    productManagerToken = loginPM.body.data.accessToken;

    // 4. Setup Super Admin
    const regAdmin = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'inv.admin@test.com',
      password: 'Password123!',
    });
    superAdminId = regAdmin.body.data.user.id;
    await User.findByIdAndUpdate(superAdminId, {
      isEmailVerified: true,
      role: ROLES.SUPER_ADMIN,
    });
    const loginAdmin = await request(app).post('/api/v1/auth/login').send({
      email: 'inv.admin@test.com',
      password: 'Password123!',
    });
    superAdminToken = loginAdmin.body.data.accessToken;

    // 5. Seed Category, Brand, Product, Variants
    const cat = await Category.create({
      name: 'Electronics',
      slug: 'electronics',
      isActive: true,
    });
    activeCatId = cat._id.toString();

    const brand = await Brand.create({
      name: 'Apple',
      slug: 'apple',
      normalizedName: 'apple',
      isActive: true,
    });

    activeBrandId = brand._id.toString();

    const prod = await Product.create({
      name: 'MacBook Pro M3',
      slug: 'macbook-pro-m3',
      categoryId: cat._id,
      brandId: brand._id,
      status: PRODUCT_STATUS.ACTIVE,
    });
    testProductId = prod._id.toString();

    // Use variantService.createVariant to test automatic inventory initialization
    const v1 = await variantService.createVariant(superAdminId, testProductId, {
      sku: 'MBP-M3-14-SLV',
      name: 'Silver 14-inch',
      price: 50000000,
      attributes: [{ name: 'Color', value: 'Silver' }],
    });
    variant1Id = v1.id;

    const v2 = await variantService.createVariant(superAdminId, testProductId, {
      sku: 'MBP-M3-16-BLK',
      name: 'Space Black 16-inch',
      price: 70000000,
      attributes: [{ name: 'Color', value: 'Space Black' }],
    });
    variant2Id = v2.id;

    // Create a variant directly to test lazy inventory creation
    const vEmpty = await ProductVariant.create({
      productId: prod._id,
      sku: 'MBP-M3-EMPTY',
      price: 30000000,
      attributeSignature: 'default',
      isActive: true,
    });
    emptyVariantId = vEmpty._id.toString();
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
          'inv.cust@test.com',
          'inv.manager@test.com',
          'inv.pm@test.com',
          'inv.admin@test.com',
        ],
      },
    });
  });

  // --------------------------------------------------------------------------
  // 1. Authorization & Role Verification (AC-01 to AC-05, INVENTORY-SEC-01)
  // --------------------------------------------------------------------------
  describe('1. Authentication & Permission Verification', () => {
    it('rejects unauthenticated requests to inventory endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/inventory');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects customer requests with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_PERMISSION_REQUIRED);
    });

    it('allows Product Manager to read inventory but forbids adjusting stock', async () => {
      // Read allowed
      const readRes = await request(app)
        .get('/api/v1/admin/inventory')
        .set('Authorization', `Bearer ${productManagerToken}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.success).toBe(true);

      // Adjust forbidden (PM only has inventory:read, not inventory:adjust)
      const adjustRes = await request(app)
        .post(`/api/v1/admin/inventory/${variant1Id}/adjust`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          type: TRANSACTION_TYPE.STOCK_IN,
          quantity: 10,
          reason: 'Attempted PM adjust',
        });
      expect(adjustRes.status).toBe(403);
      expect(adjustRes.body.error.code).toBe(ErrorCodes.ERR_PERMISSION_REQUIRED);
    });

    it('allows Inventory Manager and Super Admin full access to read and adjust inventory', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory')
        .set('Authorization', `Bearer ${inventoryManagerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Automatic & Lazy Inventory Creation (AC-06 to AC-10)
  // --------------------------------------------------------------------------
  describe('2. Automatic & Lazy Inventory Record Lifecycle', () => {
    it('automatically created default inventory record (onHand: 0, reserved: 0, threshold: 5) on variant creation', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/inventory/${variant1Id}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.inventory).toMatchObject({
        variantId: variant1Id,
        sku: 'MBP-M3-14-SLV',
        onHand: 0,
        reserved: 0,
        available: 0,
        lowStockThreshold: 5,
        stockStatus: STOCK_STATUS.OUT_OF_STOCK,
        inStock: false,
      });
    });

    it('lazily initializes inventory record if accessed for a variant created directly', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/inventory/${emptyVariantId}`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.inventory).toMatchObject({
        variantId: emptyVariantId,
        onHand: 0,
        reserved: 0,
        available: 0,
        stockStatus: STOCK_STATUS.OUT_OF_STOCK,
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. Stock Adjustments (STOCK_IN, STOCK_OUT, ADJUSTMENT) (AC-11 to AC-25)
  // --------------------------------------------------------------------------
  describe('3. Stock In, Stock Out & Absolute Adjustments', () => {
    it('successfully performs STOCK_IN (+20 units) and updates status to IN_STOCK', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/inventory/${variant1Id}/adjust`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({
          type: TRANSACTION_TYPE.STOCK_IN,
          quantity: 20,
          reason: 'Initial warehouse shipment arrival',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.inventory).toMatchObject({
        variantId: variant1Id,
        onHand: 20,
        reserved: 0,
        available: 20,
        lowStockThreshold: 5,
        stockStatus: STOCK_STATUS.IN_STOCK,
        inStock: true,
      });
    });

    it('records an immutable transaction audit log for STOCK_IN', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/inventory/${variant1Id}/transactions`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions).toHaveLength(1);
      expect(res.body.data.transactions[0]).toMatchObject({
        variantId: variant1Id,
        type: TRANSACTION_TYPE.STOCK_IN,
        quantity: 20,
        previousOnHand: 0,
        newOnHand: 20,
        previousReserved: 0,
        newReserved: 0,
        reason: 'Initial warehouse shipment arrival',
        createdBy: {
          id: inventoryManagerId,
          email: 'inv.manager@test.com',
        },
      });
    });

    it('successfully performs STOCK_OUT (-16 units) transitioning status to LOW_STOCK (available 4 <= threshold 5)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/inventory/${variant1Id}/adjust`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: TRANSACTION_TYPE.STOCK_OUT,
          quantity: 16,
          reason: 'Sample unit allocation',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.inventory).toMatchObject({
        variantId: variant1Id,
        onHand: 4,
        reserved: 0,
        available: 4,
        lowStockThreshold: 5,
        stockStatus: STOCK_STATUS.LOW_STOCK,
        inStock: true,
      });
    });

    it('rejects STOCK_OUT if requested quantity exceeds available stock', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/inventory/${variant1Id}/adjust`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({
          type: TRANSACTION_TYPE.STOCK_OUT,
          quantity: 10, // Only 4 available
          reason: 'Damaged item disposal',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(
        ErrorCodes.ERR_INVENTORY_INSUFFICIENT_STOCK
      );
    });

    it('successfully performs absolute ADJUSTMENT setting onHand to 15', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/inventory/${variant1Id}/adjust`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({
          type: TRANSACTION_TYPE.ADJUSTMENT,
          quantity: 15,
          reason: 'Cycle count physical inventory audit',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.inventory).toMatchObject({
        variantId: variant1Id,
        onHand: 15,
        reserved: 0,
        available: 15,
        stockStatus: STOCK_STATUS.IN_STOCK,
      });

      // Verify transaction diff for ADJUSTMENT
      const txRes = await request(app)
        .get(`/api/v1/admin/inventory/${variant1Id}/transactions`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`);

      const latestTx = txRes.body.data.transactions[0];
      expect(latestTx).toMatchObject({
        type: TRANSACTION_TYPE.ADJUSTMENT,
        quantity: 11, // diff from 4 to 15
        previousOnHand: 4,
        newOnHand: 15,
      });
    });

    it('rejects invalid adjustment parameters (negative quantities or empty reason)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/inventory/${variant1Id}/adjust`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({
          type: TRANSACTION_TYPE.STOCK_IN,
          quantity: -5,
          reason: 'Negative test',
        });

      expect(res.status).toBe(400);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Low-Stock Threshold & Stock Status (AC-26 to AC-35)
  // --------------------------------------------------------------------------
  describe('4. Low-Stock Threshold Updates & Status Evaluation', () => {
    it('updates custom lowStockThreshold to 18 and recalculates stockStatus to LOW_STOCK (15 <= 18)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/inventory/${variant1Id}/threshold`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({
          lowStockThreshold: 18,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.inventory).toMatchObject({
        variantId: variant1Id,
        onHand: 15,
        lowStockThreshold: 18,
        stockStatus: STOCK_STATUS.LOW_STOCK,
        inStock: true,
      });
    });

    it('rejects invalid lowStockThreshold (negative value)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/inventory/${variant1Id}/threshold`)
        .set('Authorization', `Bearer ${inventoryManagerToken}`)
        .send({
          lowStockThreshold: -3,
        });

      expect(res.status).toBe(400);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Inventory Listing, Filtering & Global Transactions (AC-36 to AC-45)
  // --------------------------------------------------------------------------
  describe('5. Inventory Admin List, Filter, Search & Global Audit Trail', () => {
    it('lists inventory with search and status filters', async () => {
      // Seed variant 2 with stock = 0 (OUT_OF_STOCK)
      const resOut = await request(app)
        .get('/api/v1/admin/inventory?status=OUT_OF_STOCK')
        .set('Authorization', `Bearer ${inventoryManagerToken}`);

      expect(resOut.status).toBe(200);
      expect(resOut.body.data.items.some((i: any) => i.variantId === variant2Id)).toBe(true);

      // Search by SKU
      const resSearch = await request(app)
        .get('/api/v1/admin/inventory?search=MBP-M3-14')
        .set('Authorization', `Bearer ${inventoryManagerToken}`);

      expect(resSearch.status).toBe(200);
      expect(resSearch.body.data.items).toHaveLength(1);
      expect(resSearch.body.data.items[0].sku).toBe('MBP-M3-14-SLV');
    });

    it('retrieves global transaction audit logs across all variants', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory/transactions')
        .set('Authorization', `Bearer ${inventoryManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 6. Deletion Safeguards (AC-46 to AC-52)
  // --------------------------------------------------------------------------
  describe('6. Deletion Safeguards for Variants & Products with Inventory History', () => {
    it('rejects hard-deletion of a ProductVariant that has active stock and transaction history', async () => {
      await expect(
        variantService.deleteVariant(testProductId, variant1Id)
      ).rejects.toThrow();

      // Verify variant still exists
      const check = await ProductVariant.findById(variant1Id);
      expect(check).not.toBeNull();
    });

    it('rejects hard-deletion of a Product whose variants have stock or transaction history', async () => {
      await expect(
        productService.deleteProduct(testProductId)
      ).rejects.toThrow();

      // Verify product still exists
      const check = await Product.findById(testProductId);
      expect(check).not.toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 7. Inventory-Aware Cart Validation (AC-53 to AC-60)
  // --------------------------------------------------------------------------
  describe('7. Inventory-Aware Cart Validation', () => {
    it('rejects adding an OUT_OF_STOCK variant to Cart with ERR_CART_INSUFFICIENT_STOCK', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          variantId: variant2Id, // onHand: 0
          quantity: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_CART_INSUFFICIENT_STOCK);
    });

    it('allows adding to Cart when sufficient stock exists (15 available, add 2)', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          variantId: variant1Id, // 15 available
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items).toHaveLength(1);
      expect(res.body.data.cart.items[0].isAvailable).toBe(true);
    });

    it('rejects updating Cart quantity beyond available stock (attempt 20 when 15 available)', async () => {
      const res = await request(app)
        .patch(`/api/v1/cart/items/${variant1Id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          quantity: 20,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.ERR_CART_INSUFFICIENT_STOCK);
    });

    it('enriches Cart items with OUT_OF_STOCK or INSUFFICIENT_STOCK if stock changes later', async () => {
      // Adjust stock down to 1 (less than cart quantity of 2)
      await request(app)
        .post(`/api/v1/admin/inventory/${variant1Id}/adjust`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: TRANSACTION_TYPE.ADJUSTMENT,
          quantity: 1,
          reason: 'Emergency inventory draw down',
        });

      // Customer fetches cart -> item marked unavailable due to INSUFFICIENT_STOCK
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items[0].isAvailable).toBe(false);
      expect(res.body.data.cart.items[0].unavailableReason).toBe(
        'INSUFFICIENT_STOCK'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 8. Storefront Public Product Detail Integration (AC-61 to AC-66)
  // --------------------------------------------------------------------------
  describe('8. Public Product Storefront Stock Availability', () => {
    it('returns accurate inStock and stockStatus on public product detail without exposing raw onHand numbers', async () => {
      const res = await request(app).get('/api/v1/products/macbook-pro-m3');

      expect(res.status).toBe(200);
      expect(res.body.data.product.variants).toBeDefined();

      const v1 = res.body.data.product.variants.find(
        (v: any) => v.id === variant1Id
      );
      const v2 = res.body.data.product.variants.find(
        (v: any) => v.id === variant2Id
      );

      expect(v1.inStock).toBe(true);
      expect(v1.stockStatus).toBe(STOCK_STATUS.LOW_STOCK); // 1 <= 18
      expect(v1.onHand).toBeUndefined(); // Security: raw counts not leaked

      expect(v2.inStock).toBe(false);
      expect(v2.stockStatus).toBe(STOCK_STATUS.OUT_OF_STOCK);
    });
  });
});
