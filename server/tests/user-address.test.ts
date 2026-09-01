import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { Address } from '../src/modules/addresses/address.model.js';
import { AuthSession } from '../src/modules/auth/auth-session.model.js';

const app = createApp();

describe('Module 03: User Profile & Address Management Test Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let userAAddressId: string;
  let userBAddressId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }
    // Clean up test data
    await User.deleteMany({ email: { $in: ['user.a@profile-test.com', 'user.b@profile-test.com'] } });
    await Address.deleteMany({});
    await AuthSession.deleteMany({});

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Alice',
      lastName: 'Profile',
      email: 'user.a@profile-test.com',
      password: 'Password123!',
    });
    userAId = resA.body.data.user.id;

    // Login User A
    const loginA = await request(app).post('/api/v1/auth/login').send({
      email: 'user.a@profile-test.com',
      password: 'Password123!',
    });
    userAToken = loginA.body.data.accessToken;

    // Register & Login User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Bob',
      lastName: 'Profile',
      email: 'user.b@profile-test.com',
      password: 'Password123!',
    });
    userBId = resB.body.data.user.id;

    const loginB = await request(app).post('/api/v1/auth/login').send({
      email: 'user.b@profile-test.com',
      password: 'Password123!',
    });
    userBToken = loginB.body.data.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['user.a@profile-test.com', 'user.b@profile-test.com'] } });
    await Address.deleteMany({});
    await AuthSession.deleteMany({});
    await mongoose.disconnect();
  });

  describe('1. User Profile Management (/api/v1/users/me)', () => {
    it('AC-01: authenticated user gets own profile with safe fields', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBe(userAId);
      expect(res.body.data.user.firstName).toBe('Alice');
      expect(res.body.data.user.lastName).toBe('Profile');
      expect(res.body.data.user.email).toBe('user.a@profile-test.com');
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.user.phone).toBeNull();
      expect(res.body.data.user.avatarUrl).toBeNull();
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects unauthenticated profile request with 401', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('AC-02, AC-03, AC-04, AC-05: updates firstName, lastName, phone, and avatarUrl', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          firstName: 'Alicia',
          lastName: 'Wonderland',
          phone: '+923001234567',
          avatarUrl: 'https://example.com/avatar.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.firstName).toBe('Alicia');
      expect(res.body.data.user.lastName).toBe('Wonderland');
      expect(res.body.data.user.phone).toBe('+923001234567');
      expect(res.body.data.user.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('allows clearing optional phone and avatarUrl with null', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          phone: null,
          avatarUrl: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.phone).toBeNull();
      expect(res.body.data.user.avatarUrl).toBeNull();
    });

    it('rejects invalid phone format with 400', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          phone: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid avatarUrl format with 400', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          avatarUrl: 'not-a-valid-url',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('AC-06, AC-07, AC-08, AC-09: mass-assignment protection prevents modifying role, email, isActive, isEmailVerified', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          role: 'ADMIN',
          email: 'hacked@email.com',
          isActive: false,
          isEmailVerified: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      // Verify in DB that no fields changed
      const userInDb = await User.findById(userAId);
      expect(userInDb!.role).toBe('CUSTOMER');
      expect(userInDb!.email).toBe('user.a@profile-test.com');
      expect(userInDb!.isActive).toBe(true);
      expect(userInDb!.isEmailVerified).toBe(false);
    });
  });

  describe('2. Address Management (/api/v1/addresses)', () => {
    it('AC-11 & AC-12: first address created automatically becomes default shipping and billing', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          label: 'Home',
          fullName: 'Alicia Wonderland',
          phone: '+923001234567',
          country: 'PK',
          stateProvince: 'KPK',
          city: 'Mardan',
          area: 'City Center',
          postalCode: '23200',
          addressLine1: 'House 10, Street 4',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.address).toBeDefined();
      expect(res.body.data.address.isDefaultShipping).toBe(true);
      expect(res.body.data.address.isDefaultBilling).toBe(true);
      expect(res.body.data.address.userId).toBe(userAId);
      userAAddressId = res.body.data.address.id;
    });

    it('second address created without default flags remains non-default', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          label: 'Office',
          fullName: 'Alicia Wonderland',
          phone: '+923001234567',
          country: 'PK',
          stateProvince: 'Federal',
          city: 'Islamabad',
          addressLine1: 'Blue Area Tower 5',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.isDefaultShipping).toBe(false);
      expect(res.body.data.address.isDefaultBilling).toBe(false);
    });

    it('AC-19 & AC-20: creating address with default flag unsets previous default', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          label: 'Warehouse',
          fullName: 'Alicia Wonderland',
          phone: '+923001234567',
          country: 'PK',
          stateProvince: 'Punjab',
          city: 'Lahore',
          addressLine1: 'Gulberg III, Main Blvd',
          isDefaultShipping: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.isDefaultShipping).toBe(true);

      // Verify the first address is no longer default shipping
      const firstAddr = await Address.findById(userAAddressId);
      expect(firstAddr!.isDefaultShipping).toBe(false);
      expect(firstAddr!.isDefaultBilling).toBe(true); // Still default billing
    });

    it('AC-13: list addresses returns only owned addresses sorted by defaults', async () => {
      const res = await request(app)
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.addresses).toHaveLength(3);
      // All returned addresses belong to user A
      res.body.data.addresses.forEach((addr: { userId: string }) => {
        expect(addr.userId).toBe(userAId);
      });
    });

    it('AC-14: gets single owned address by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/addresses/${userAAddressId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.address.id).toBe(userAAddressId);
    });

    it('AC-15: updates single owned address', async () => {
      const res = await request(app)
        .patch(`/api/v1/addresses/${userAAddressId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          label: 'Family Home',
          addressLine2: 'Suite 200',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.address.label).toBe('Family Home');
      expect(res.body.data.address.addressLine2).toBe('Suite 200');
    });

    it('AC-17: sets address as default shipping', async () => {
      const res = await request(app)
        .patch(`/api/v1/addresses/${userAAddressId}/default-shipping`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.address.isDefaultShipping).toBe(true);

      // Verify no other address for user A is default shipping
      const otherShippingDefaults = await Address.countDocuments({
        userId: userAId,
        _id: { $ne: userAAddressId },
        isDefaultShipping: true,
      });
      expect(otherShippingDefaults).toBe(0);
    });

    it('AC-18: sets address as default billing', async () => {
      const res = await request(app)
        .patch(`/api/v1/addresses/${userAAddressId}/default-billing`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.address.isDefaultBilling).toBe(true);
    });

    it('AC-22: deleting default address assigns replacement default from remaining addresses', async () => {
      // User A currently has 3 addresses, userAAddressId is default shipping & billing
      const deleteRes = await request(app)
        .delete(`/api/v1/addresses/${userAAddressId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify a remaining address was promoted to default shipping and default billing
      const remaining = await Address.find({ userId: userAId });
      expect(remaining).toHaveLength(2);

      const hasDefaultShipping = remaining.some((a) => a.isDefaultShipping);
      const hasDefaultBilling = remaining.some((a) => a.isDefaultBilling);
      expect(hasDefaultShipping).toBe(true);
      expect(hasDefaultBilling).toBe(true);
    });

    it('handles invalid address ID format with 400 instead of 500 server crash', async () => {
      const res = await request(app)
        .get('/api/v1/addresses/not-a-valid-object-id')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Cross-User IDOR & Security Protection', () => {
    beforeAll(async () => {
      // User B creates an address
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          label: 'Bob Secret Home',
          fullName: 'Bob Profile',
          phone: '+14155552671',
          country: 'US',
          stateProvince: 'CA',
          city: 'San Francisco',
          addressLine1: '123 Market St',
        });
      userBAddressId = res.body.data.address.id;
    });

    it('AC-24: User A cannot GET User B address (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/addresses/${userBAddressId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('AC-25: User A cannot PATCH User B address (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/addresses/${userBAddressId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          label: 'Hacked Label',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify Bob address unchanged
      const bobAddr = await Address.findById(userBAddressId);
      expect(bobAddr!.label).toBe('Bob Secret Home');
    });

    it('AC-26: User A cannot DELETE User B address (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/addresses/${userBAddressId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(404);

      // Verify Bob address still exists
      const bobAddr = await Address.findById(userBAddressId);
      expect(bobAddr).not.toBeNull();
    });

    it('User A cannot set default shipping on User B address (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/addresses/${userBAddressId}/default-shipping`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(404);
    });

    it('User A cannot set default billing on User B address (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/v1/addresses/${userBAddressId}/default-billing`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('4. Address Limit Enforcement (Max 20)', () => {
    it('AC-23: enforces maximum 20 addresses per user', async () => {
      // Clear User B addresses
      await Address.deleteMany({ userId: userBId });

      // Create 20 addresses for User B
      for (let i = 1; i <= 20; i++) {
        const res = await request(app)
          .post('/api/v1/addresses')
          .set('Authorization', `Bearer ${userBToken}`)
          .send({
            label: `Address ${i}`,
            fullName: 'Bob Profile',
            phone: '+14155552671',
            country: 'US',
            stateProvince: 'CA',
            city: 'San Francisco',
            addressLine1: `${i} Test Street`,
          });
        expect(res.status).toBe(201);
      }

      // Attempt to create 21st address
      const limitRes = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          label: 'Address 21',
          fullName: 'Bob Profile',
          phone: '+14155552671',
          country: 'US',
          stateProvince: 'CA',
          city: 'San Francisco',
          addressLine1: '21 Overflow St',
        });

      expect(limitRes.status).toBe(409);
      expect(limitRes.body.success).toBe(false);
      expect(limitRes.body.error.code).toBe('ERR_ADDRESS_LIMIT_REACHED');
    });
  });
});
