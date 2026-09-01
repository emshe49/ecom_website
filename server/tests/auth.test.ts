import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User, UserRole } from '../src/modules/users/user.model.js';
import { AuthSession } from '../src/modules/auth/auth-session.model.js';
import { env } from '../src/config/env.js';
import { generateCryptoToken } from '../src/shared/security/password.service.js';

const app = createApp();

describe('Module 02: Authentication System Test Suite', () => {
  beforeAll(async () => {
    // Connect to test database or existing MongoDB
    const testDbUri = env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(testDbUri);
    }
  });

  afterAll(async () => {
    // Clean up test collections and close connection
    await User.deleteMany({ email: /@test-auth\.com$/ });
    await AuthSession.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up test users between runs
    await User.deleteMany({ email: /@test-auth\.com$/ });
    await AuthSession.deleteMany({});
  });

  describe('1. Registration (/api/v1/auth/register)', () => {
    it('AC-01: successfully registers a new customer', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test-auth.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('john.doe@test-auth.com');
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.user.isEmailVerified).toBe(false);

      // Security Check: No sensitive fields in response
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.emailVerificationTokenHash).toBeUndefined();

      // Check DB persistence & hashed password
      const savedUser = await User.findOne({ email: 'john.doe@test-auth.com' }).select('+passwordHash +emailVerificationTokenHash');
      expect(savedUser).not.toBeNull();
      expect(savedUser!.passwordHash).not.toBe('Password123!');
      expect(savedUser!.passwordHash.startsWith('$2')).toBe(true); // bcrypt hash
      expect(savedUser!.emailVerificationTokenHash).toBeDefined();
    });

    it('AC-02 & Security AC-1: public registration cannot escalate role to ADMIN', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Hacker',
          lastName: 'Admin',
          email: 'hacker@test-auth.com',
          password: 'Password123!',
          role: 'ADMIN',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('CUSTOMER'); // Ignored payload role

      const dbUser = await User.findOne({ email: 'hacker@test-auth.com' });
      expect(dbUser!.role).toBe('CUSTOMER');
    });

    it('rejects invalid email formats', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Invalid',
          lastName: 'Email',
          email: 'invalid-email-format',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects weak passwords', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Weak',
          lastName: 'Password',
          email: 'weak@test-auth.com',
          password: 'simple', // Missing uppercase, number, min length
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('AC-03: rejects duplicate emails with 409 Conflict', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'First',
          lastName: 'User',
          email: 'duplicate@test-auth.com',
          password: 'Password123!',
        });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Second',
          lastName: 'User',
          email: 'DUPLICATE@test-auth.com', // Normalization test
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_EMAIL_ALREADY_EXISTS');
    });
  });

  describe('2. Login (/api/v1/auth/login)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'login.test@test-auth.com',
          password: 'Password123!',
        });
    });

    it('AC-05: successfully logs in with valid credentials and sets HttpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login.test@test-auth.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('login.test@test-auth.com');

      // Verify HttpOnly cookie header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refreshToken=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);

      // Verify session created in DB
      const loggedInUser = await User.findOne({ email: 'login.test@test-auth.com' });
      const sessions = await AuthSession.find({ userId: loggedInUser!._id });
      expect(sessions.length).toBe(1);
      expect(sessions[0].revokedAt).toBeNull();
    });

    it('AC-06 & Security AC-5: unknown email and wrong password return identical 401 error', async () => {
      // Unknown email
      const resUnknown = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown.user@test-auth.com',
          password: 'Password123!',
        });

      // Wrong password
      const resWrongPass = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login.test@test-auth.com',
          password: 'WrongPassword123!',
        });

      expect(resUnknown.status).toBe(401);
      expect(resWrongPass.status).toBe(401);
      expect(resUnknown.body.error.code).toBe('ERR_INVALID_CREDENTIALS');
      expect(resWrongPass.body.error.code).toBe('ERR_INVALID_CREDENTIALS');
      expect(resUnknown.body.error.message).toBe(resWrongPass.body.error.message);
    });

    it('rejects disabled accounts', async () => {
      await User.updateOne({ email: 'login.test@test-auth.com' }, { isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login.test@test-auth.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ERR_ACCOUNT_DISABLED');
    });
  });

  describe('3. Token Refresh (/api/v1/auth/refresh)', () => {
    it('AC-09: rotates refresh token and issues new access token', async () => {
      // 1. Register & Login
      await request(app).post('/api/v1/auth/register').send({
        firstName: 'Refresh',
        lastName: 'Tester',
        email: 'refresh@test-auth.com',
        password: 'Password123!',
      });

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'refresh@test-auth.com',
        password: 'Password123!',
      });

      const cookies = loginRes.headers['set-cookie'];
      const initialCookie = cookies[0];

      // 2. Call Refresh
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [initialCookie]);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      const newCookies = refreshRes.headers['set-cookie'];
      const newCookie = newCookies[0];
      expect(newCookie).not.toBe(initialCookie); // Token rotated!

      // 3. Security AC-8: Trying to reuse the old rotated refresh token fails
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [initialCookie]);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.code).toBe('ERR_REFRESH_TOKEN_INVALID');
    });
  });

  describe('4. Logout & Logout All (/api/v1/auth/logout)', () => {
    it('AC-13: logout revokes session and clears cookie', async () => {
      await request(app).post('/api/v1/auth/register').send({
        firstName: 'Logout',
        lastName: 'User',
        email: 'logout@test-auth.com',
        password: 'Password123!',
      });

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'logout@test-auth.com',
        password: 'Password123!',
      });

      const cookie = loginRes.headers['set-cookie'][0];

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [cookie]);

      expect(logoutRes.status).toBe(200);

      // Session in DB should be marked revoked
      const session = await AuthSession.findOne({});
      expect(session!.revokedAt).not.toBeNull();

      // Refreshing with revoked token should fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [cookie]);

      expect(refreshRes.status).toBe(401);
    });

    it('AC-14: logout-all revokes all active sessions for the user', async () => {
      await request(app).post('/api/v1/auth/register').send({
        firstName: 'Multi',
        lastName: 'Device',
        email: 'multi@test-auth.com',
        password: 'Password123!',
      });

      // Login device 1
      const login1 = await request(app).post('/api/v1/auth/login').send({
        email: 'multi@test-auth.com',
        password: 'Password123!',
      });

      // Login device 2
      const login2 = await request(app).post('/api/v1/auth/login').send({
        email: 'multi@test-auth.com',
        password: 'Password123!',
      });

      const token1 = login1.body.data.accessToken;
      const cookie2 = login2.headers['set-cookie'][0];

      // Logout from all devices using token 1
      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${token1}`);

      expect(logoutAllRes.status).toBe(200);

      // Both sessions revoked in DB
      const activeSessions = await AuthSession.find({ revokedAt: null });
      expect(activeSessions.length).toBe(0);

      // Device 2 refresh now fails
      const refresh2 = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [cookie2]);

      expect(refresh2.status).toBe(401);
    });
  });

  describe('5. Email Verification (/api/v1/auth/verify-email)', () => {
    it('AC-15: verifies email with valid token and prevents reuse', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        firstName: 'Email',
        lastName: 'Verify',
        email: 'verify@test-auth.com',
        password: 'Password123!',
      });

      const user = await User.findById(regRes.body.data.user.id).select('+emailVerificationTokenHash');
      
      // Generate a known token for deterministic test
      const { rawToken, tokenHash } = generateCryptoToken();
      user!.emailVerificationTokenHash = tokenHash;
      user!.emailVerificationExpiresAt = new Date(Date.now() + 60000);
      await user!.save();

      // Verify email
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      const updatedUser = await User.findById(user!._id);
      expect(updatedUser!.isEmailVerified).toBe(true);

      // Token cannot be reused
      const retryRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken });

      expect(retryRes.status).toBe(400);
      expect(retryRes.body.error.code).toBe('ERR_VERIFICATION_TOKEN_INVALID');
    });
  });

  describe('6. Forgot & Reset Password', () => {
    it('AC-17 & Security AC-6: forgot-password returns generic response for existing and non-existing emails', async () => {
      await request(app).post('/api/v1/auth/register').send({
        firstName: 'Forgot',
        lastName: 'Pass',
        email: 'exists@test-auth.com',
        password: 'Password123!',
      });

      const resExists = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'exists@test-auth.com' });

      const resNonExists = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'doesnotexist@test-auth.com' });

      expect(resExists.status).toBe(200);
      expect(resNonExists.status).toBe(200);
      expect(resExists.body.data.message).toBe(resNonExists.body.data.message);
    });

    it('AC-18 & Security AC-7: resets password and invalidates existing sessions', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        firstName: 'Reset',
        lastName: 'User',
        email: 'reset@test-auth.com',
        password: 'OldPassword123!',
      });

      // Login to create session
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'reset@test-auth.com',
        password: 'OldPassword123!',
      });

      const oldCookie = loginRes.headers['set-cookie'][0];

      // Seed password reset token
      const user = await User.findById(regRes.body.data.user.id);
      const { rawToken, tokenHash } = generateCryptoToken();
      user!.passwordResetTokenHash = tokenHash;
      user!.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user!.save();

      // Reset password
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'BrandNewPassword123!',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Old session invalidated
      const refreshOld = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [oldCookie]);

      expect(refreshOld.status).toBe(401);

      // Login with old password fails
      const loginOld = await request(app).post('/api/v1/auth/login').send({
        email: 'reset@test-auth.com',
        password: 'OldPassword123!',
      });
      expect(loginOld.status).toBe(401);

      // Login with new password succeeds
      const loginNew = await request(app).post('/api/v1/auth/login').send({
        email: 'reset@test-auth.com',
        password: 'BrandNewPassword123!',
      });
      expect(loginNew.status).toBe(200);
    });
  });

  describe('7. Change Password (/api/v1/auth/change-password)', () => {
    it('AC-21: changes password when current password is valid and rejects same password', async () => {
      await request(app).post('/api/v1/auth/register').send({
        firstName: 'Change',
        lastName: 'Pass',
        email: 'change@test-auth.com',
        password: 'InitialPassword123!',
      });

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'change@test-auth.com',
        password: 'InitialPassword123!',
      });

      const accessToken = loginRes.body.data.accessToken;

      // Reject same password
      const sameRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'InitialPassword123!',
          newPassword: 'InitialPassword123!',
        });

      expect(sameRes.status).toBe(400);
      expect(sameRes.body.error.code).toBe('ERR_PASSWORD_SAME_AS_CURRENT');

      // Change to new password
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'InitialPassword123!',
          newPassword: 'UpdatedPassword123!',
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.success).toBe(true);
    });
  });

  describe('8. Current User & Authentication Middleware (/api/v1/auth/me)', () => {
    it('AC-12 & AC-22: returns authenticated user for valid token, rejects missing/invalid token', async () => {
      await request(app).post('/api/v1/auth/register').send({
        firstName: 'Me',
        lastName: 'User',
        email: 'me@test-auth.com',
        password: 'Password123!',
      });

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'me@test-auth.com',
        password: 'Password123!',
      });

      const token = loginRes.body.data.accessToken;

      // Valid token
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe('me@test-auth.com');

      // Missing token
      const unauthRes = await request(app).get('/api/v1/auth/me');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('ERR_UNAUTHORIZED');

      // Invalid token
      const invalidRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer totally-invalid-token');
      expect(invalidRes.status).toBe(401);
      expect(invalidRes.body.error.code).toBe('ERR_TOKEN_INVALID');
    });
  });
});
