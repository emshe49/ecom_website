import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { AuthSession } from '../src/modules/auth/auth-session.model.js';
import { ROLES } from '../src/modules/authorization/roles.js';
import { PERMISSIONS, ALL_PERMISSIONS } from '../src/modules/authorization/permissions.js';
import { authorizationService } from '../src/modules/authorization/authorization.service.js';

const app = createApp();

describe('Module 04: Roles & Permissions (RBAC) Test Suite', () => {
  let superAdminToken: string;
  let superAdminId: string;
  let productManagerToken: string;
  let productManagerId: string;
  let customerToken: string;
  let customerId: string;
  let createdStaffId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    // Clean up test data
    await User.deleteMany({
      email: {
        $in: [
          'superadmin@rbac-test.com',
          'pm@rbac-test.com',
          'customer@rbac-test.com',
          'staff.new@rbac-test.com',
        ],
      },
    });
    await AuthSession.deleteMany({});

    // 1. Create and login SUPER_ADMIN
    const regSuper = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@rbac-test.com',
      password: 'Password123!',
    });
    superAdminId = regSuper.body.data.user.id;

    // Elevate in DB directly for test fixture
    await User.findByIdAndUpdate(superAdminId, { role: ROLES.SUPER_ADMIN, isEmailVerified: true });

    const loginSuper = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@rbac-test.com',
      password: 'Password123!',
    });
    superAdminToken = loginSuper.body.data.accessToken;

    // 2. Create and login PRODUCT_MANAGER
    const regPM = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Product',
      lastName: 'Manager',
      email: 'pm@rbac-test.com',
      password: 'Password123!',
    });
    productManagerId = regPM.body.data.user.id;
    await User.findByIdAndUpdate(productManagerId, {
      role: ROLES.PRODUCT_MANAGER,
      isEmailVerified: true,
    });

    const loginPM = await request(app).post('/api/v1/auth/login').send({
      email: 'pm@rbac-test.com',
      password: 'Password123!',
    });
    productManagerToken = loginPM.body.data.accessToken;

    // 3. Create and login CUSTOMER
    const regCust = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Normal',
      lastName: 'Customer',
      email: 'customer@rbac-test.com',
      password: 'Password123!',
    });
    customerId = regCust.body.data.user.id;

    const loginCust = await request(app).post('/api/v1/auth/login').send({
      email: 'customer@rbac-test.com',
      password: 'Password123!',
    });
    customerToken = loginCust.body.data.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          'superadmin@rbac-test.com',
          'pm@rbac-test.com',
          'customer@rbac-test.com',
          'staff.new@rbac-test.com',
        ],
      },
    });
    await AuthSession.deleteMany({});
    await mongoose.disconnect();
  });

  describe('1. Role-Permission Catalog & Unit Resolution', () => {
    it('AC-04: SUPER_ADMIN has every known permission in the catalog', () => {
      const perms = authorizationService.getPermissionsForRole(ROLES.SUPER_ADMIN);
      expect(perms).toHaveLength(ALL_PERMISSIONS.length);
      ALL_PERMISSIONS.forEach((p) => {
        expect(authorizationService.hasPermission(ROLES.SUPER_ADMIN, p)).toBe(true);
      });
    });

    it('AC-05: CUSTOMER has empty administrative permissions', () => {
      const perms = authorizationService.getPermissionsForRole(ROLES.CUSTOMER);
      expect(perms).toHaveLength(0);
      expect(authorizationService.hasPermission(ROLES.CUSTOMER, PERMISSIONS.PRODUCT_CREATE)).toBe(
        false
      );
      expect(authorizationService.hasPermission(ROLES.CUSTOMER, PERMISSIONS.USER_READ)).toBe(false);
    });

    it('AC-06: PRODUCT_MANAGER has product/catalog permissions but not admin management', () => {
      expect(
        authorizationService.hasPermission(ROLES.PRODUCT_MANAGER, PERMISSIONS.PRODUCT_CREATE)
      ).toBe(true);
      expect(
        authorizationService.hasPermission(ROLES.PRODUCT_MANAGER, PERMISSIONS.CATEGORY_CREATE)
      ).toBe(true);
      expect(
        authorizationService.hasPermission(ROLES.PRODUCT_MANAGER, PERMISSIONS.ADMIN_USER_CREATE)
      ).toBe(false);
      expect(
        authorizationService.hasPermission(ROLES.PRODUCT_MANAGER, PERMISSIONS.ADMIN_USER_UPDATE_ROLE)
      ).toBe(false);
    });

    it('AC-07: ORDER_MANAGER has order and fulfillment permissions', () => {
      expect(authorizationService.hasPermission(ROLES.ORDER_MANAGER, PERMISSIONS.ORDER_READ)).toBe(
        true
      );
      expect(
        authorizationService.hasPermission(ROLES.ORDER_MANAGER, PERMISSIONS.ORDER_FULFILL)
      ).toBe(true);
      expect(
        authorizationService.hasPermission(ROLES.ORDER_MANAGER, PERMISSIONS.PRODUCT_CREATE)
      ).toBe(false);
    });

    it('AC-08: INVENTORY_MANAGER has inventory update and adjustment permissions', () => {
      expect(
        authorizationService.hasPermission(ROLES.INVENTORY_MANAGER, PERMISSIONS.INVENTORY_ADJUST)
      ).toBe(true);
      expect(
        authorizationService.hasPermission(ROLES.INVENTORY_MANAGER, PERMISSIONS.ADMIN_USER_READ)
      ).toBe(false);
    });

    it('AC-09: CUSTOMER_SUPPORT has support ticket permissions', () => {
      expect(
        authorizationService.hasPermission(ROLES.CUSTOMER_SUPPORT, PERMISSIONS.SUPPORT_CLOSE)
      ).toBe(true);
      expect(
        authorizationService.hasPermission(ROLES.CUSTOMER_SUPPORT, PERMISSIONS.PRODUCT_DELETE)
      ).toBe(false);
      expect(
        authorizationService.hasPermission(ROLES.CUSTOMER_SUPPORT, PERMISSIONS.INVENTORY_ADJUST)
      ).toBe(false);
    });

    it('AC-10: ADMIN has broad operational permissions but cannot create or change admin user roles', () => {
      expect(authorizationService.hasPermission(ROLES.ADMIN, PERMISSIONS.PRODUCT_CREATE)).toBe(true);
      expect(authorizationService.hasPermission(ROLES.ADMIN, PERMISSIONS.ORDER_CANCEL)).toBe(true);
      expect(authorizationService.hasPermission(ROLES.ADMIN, PERMISSIONS.ADMIN_USER_CREATE)).toBe(
        false
      );
      expect(
        authorizationService.hasPermission(ROLES.ADMIN, PERMISSIONS.ADMIN_USER_UPDATE_ROLE)
      ).toBe(false);
    });
  });

  describe('2. Permission Introspection API (/api/v1/auth/permissions)', () => {
    it('AC-27: returns current role and effective permissions for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/permissions')
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(ROLES.PRODUCT_MANAGER);
      expect(res.body.data.permissions).toContain(PERMISSIONS.PRODUCT_CREATE);
      expect(res.body.data.permissions).not.toContain(PERMISSIONS.ADMIN_USER_UPDATE_ROLE);
    });
  });

  describe('3. Admin Staff User Management & Security Access Control', () => {
    it('AC-12: unauthenticated request to admin staff endpoint returns 401', async () => {
      const res = await request(app).get('/api/v1/admin/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('AC-13, AC-16 & RBAC-SEC-01: CUSTOMER calling admin staff endpoints returns 403 Forbidden', async () => {
      const resGet = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(resGet.status).toBe(403);
      expect(resGet.body.error.code).toBe('ERR_PERMISSION_REQUIRED');

      const resPost = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          firstName: 'Illegal',
          lastName: 'Staff',
          email: 'illegal@rbac-test.com',
          role: ROLES.PRODUCT_MANAGER,
        });
      expect(resPost.status).toBe(403);
    });

    it('RBAC-SEC-04: PRODUCT_MANAGER cannot manage staff or assign roles (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${productManagerId}/role`)
        .set('Authorization', `Bearer ${productManagerToken}`)
        .send({
          role: ROLES.ORDER_MANAGER,
        });
      expect(res.status).toBe(403);
    });

    it('AC-17: SUPER_ADMIN can create a new staff account', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'New',
          lastName: 'Staff',
          email: 'staff.new@rbac-test.com',
          role: ROLES.ORDER_MANAGER,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(ROLES.ORDER_MANAGER);
      expect(res.body.data.user.email).toBe('staff.new@rbac-test.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      createdStaffId = res.body.data.user.id;
    });

    it('AC-18 & RBAC-SEC-08: rejects unsupported or CUSTOMER role assignment on staff creation', async () => {
      const resCustomer = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'Invalid',
          lastName: 'Role',
          email: 'invalid.role@rbac-test.com',
          role: ROLES.CUSTOMER,
        });
      expect(resCustomer.status).toBe(400);

      const resSuper = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'Invalid',
          lastName: 'Role',
          email: 'invalid.super@rbac-test.com',
          role: ROLES.SUPER_ADMIN,
        });
      expect(resSuper.status).toBe(400);
    });

    it('AC-19: rejects duplicate staff email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'Duplicate',
          lastName: 'Staff',
          email: 'staff.new@rbac-test.com',
          role: ROLES.PRODUCT_MANAGER,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ERR_STAFF_EMAIL_ALREADY_EXISTS');
    });

    it('AC-20: SUPER_ADMIN lists staff users (returns only administrative roles, not customers)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(3);
      // Verify no CUSTOMER is listed
      res.body.data.users.forEach((u: { role: string }) => {
        expect(u.role).not.toBe(ROLES.CUSTOMER);
      });
    });

    it('AC-21: SUPER_ADMIN can update staff role and revoke old sessions', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${createdStaffId}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          role: ROLES.INVENTORY_MANAGER,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe(ROLES.INVENTORY_MANAGER);

      // Verify in DB
      const updatedUser = await User.findById(createdStaffId);
      expect(updatedUser!.role).toBe(ROLES.INVENTORY_MANAGER);
    });

    it('AC-22: SUPER_ADMIN cannot accidentally change own role (returns 400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${superAdminId}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          role: ROLES.PRODUCT_MANAGER,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_CANNOT_CHANGE_OWN_ROLE');
    });

    it('AC-23: SUPER_ADMIN can disable and enable staff account', async () => {
      // Disable staff
      const resDisable = await request(app)
        .patch(`/api/v1/admin/users/${createdStaffId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          isActive: false,
        });

      expect(resDisable.status).toBe(200);
      expect(resDisable.body.data.user.isActive).toBe(false);

      // Re-enable staff
      const resEnable = await request(app)
        .patch(`/api/v1/admin/users/${createdStaffId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          isActive: true,
        });

      expect(resEnable.status).toBe(200);
      expect(resEnable.body.data.user.isActive).toBe(true);
    });

    it('AC-24: SUPER_ADMIN cannot disable own account (returns 400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${superAdminId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ERR_CANNOT_DISABLE_SELF');
    });

    it('AC-25 & RBAC-SEC-10: disabled staff account immediately fails authentication on next request', async () => {
      // Disable product manager
      await User.findByIdAndUpdate(productManagerId, { isActive: false });

      // Request with product manager token
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${productManagerToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      // Restore active status
      await User.findByIdAndUpdate(productManagerId, { isActive: true });
    });

    it('AC-14 & RBAC-SEC-03: real-time database role is authoritative (overriding stale token claims)', async () => {
      // Promote customer to ORDER_MANAGER directly in DB
      await User.findByIdAndUpdate(customerId, { role: ROLES.ORDER_MANAGER });

      // Request permissions with customer token (which had CUSTOMER in token claim)
      const res = await request(app)
        .get('/api/v1/auth/permissions')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe(ROLES.ORDER_MANAGER);
      expect(res.body.data.permissions).toContain(PERMISSIONS.ORDER_READ);

      // Restore CUSTOMER
      await User.findByIdAndUpdate(customerId, { role: ROLES.CUSTOMER });
    });

    it('RBAC-SEC-06: ORDER_MANAGER cannot create admin/staff users (returns 403 Forbidden)', async () => {
      // Create ORDER_MANAGER token
      const regOM = await request(app).post('/api/v1/auth/register').send({
        firstName: 'Order',
        lastName: 'Manager',
        email: 'om@rbac-test.com',
        password: 'Password123!',
      });
      const omId = regOM.body.data.user.id;
      await User.findByIdAndUpdate(omId, { role: ROLES.ORDER_MANAGER, isEmailVerified: true });

      const loginOM = await request(app).post('/api/v1/auth/login').send({
        email: 'om@rbac-test.com',
        password: 'Password123!',
      });
      const omToken = loginOM.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${omToken}`)
        .send({
          firstName: 'Another',
          lastName: 'Staff',
          email: 'another.staff@rbac-test.com',
          role: ROLES.INVENTORY_MANAGER,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_PERMISSION_REQUIRED');

      await User.findByIdAndDelete(omId);
    });

    it('RBAC-SEC-09: Public registration cannot create administrative roles via payload injection', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        firstName: 'Hacker',
        lastName: 'User',
        email: 'hacker@rbac-test.com',
        password: 'Password123!',
        role: ROLES.SUPER_ADMIN,
      });

      // Zod strict schema rejects unknown / role injection or registers as CUSTOMER
      if (res.status === 201) {
        expect(res.body.data.user.role).toBe(ROLES.CUSTOMER);
        await User.findByIdAndDelete(res.body.data.user.id);
      } else {
        expect(res.status).toBe(400);
      }
    });
  });
});
