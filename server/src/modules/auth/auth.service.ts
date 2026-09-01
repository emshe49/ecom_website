import { Types } from 'mongoose';
import { User, UserRole, SafeUser } from '../users/user.model.js';
import { AuthSession } from './auth-session.model.js';
import {
  RegisterDTO,
  LoginDTO,
  ResetPasswordDTO,
  ChangePasswordDTO,
  AuthResult,
  RequestMetadata,
} from './auth.types.js';
import {
  hashPassword,
  verifyPassword,
  generateCryptoToken,
  hashCryptoToken,
} from '../../shared/security/password.service.js';
import {
  generateAccessToken,
  generateRefreshTokenString,
  getRefreshTokenExpiryDate,
} from './auth-token.service.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../../shared/email/email.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export class AuthService {
  /**
   * Register a new customer
   */
  async register(data: RegisterDTO): Promise<{ user: SafeUser; message: string }> {
    const email = data.email.toLowerCase().trim();

    // Check email uniqueness
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(
        'An account with this email already exists.',
        409,
        ErrorCodes.ERR_EMAIL_ALREADY_EXISTS
      );
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Generate email verification token (24-hour expiry)
    const { rawToken, tokenHash } = generateCryptoToken();
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user strictly with role CUSTOMER
    const user = await User.create({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email,
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: false,
      isActive: true,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt,
    });

    // Send verification email asynchronously
    sendVerificationEmail(user.email, rawToken, user.firstName).catch(() => {});

    return {
      user: user.toJSON() as SafeUser,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * Login user and create session
   */
  async login(data: LoginDTO, meta: RequestMetadata): Promise<AuthResult> {
    const email = data.email.toLowerCase().trim();

    // Find user with password hash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password.', 401, ErrorCodes.ERR_INVALID_CREDENTIALS);
    }

    // Check active status
    if (!user.isActive) {
      throw new AppError(
        'Your account has been disabled. Please contact support.',
        403,
        ErrorCodes.ERR_ACCOUNT_DISABLED
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401, ErrorCodes.ERR_INVALID_CREDENTIALS);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    const refreshToken = generateRefreshTokenString();
    const refreshTokenHash = hashCryptoToken(refreshToken);
    const expiresAt = getRefreshTokenExpiryDate();

    // Persist session
    await AuthSession.create({
      userId: user._id,
      refreshTokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    });

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: user.toJSON() as SafeUser,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Rotate refresh token and issue new access token
   */
  async refresh(rawRefreshToken: string, meta: RequestMetadata): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new AppError('Refresh token is required', 401, ErrorCodes.ERR_REFRESH_TOKEN_INVALID);
    }

    const tokenHash = hashCryptoToken(rawRefreshToken);

    // Find active session
    const session = await AuthSession.findOne({
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new AppError(
        'Invalid or expired refresh token session',
        401,
        ErrorCodes.ERR_REFRESH_TOKEN_INVALID
      );
    }

    // Find user
    const user = await User.findById(session.userId);
    if (!user || !user.isActive) {
      // Revoke session if user no longer valid
      session.revokedAt = new Date();
      await session.save();
      throw new AppError('User account is invalid or disabled', 401, ErrorCodes.ERR_UNAUTHORIZED);
    }

    // Check if password changed after session creation
    if (user.passwordChangedAt && session.createdAt < user.passwordChangedAt) {
      session.revokedAt = new Date();
      await session.save();
      throw new AppError('Session invalidated by password change', 401, ErrorCodes.ERR_TOKEN_EXPIRED);
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken({
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    const newRefreshToken = generateRefreshTokenString();
    const newRefreshTokenHash = hashCryptoToken(newRefreshToken);

    session.refreshTokenHash = newRefreshTokenHash;
    session.lastUsedAt = new Date();
    session.expiresAt = getRefreshTokenExpiryDate();
    if (meta.userAgent) session.userAgent = meta.userAgent;
    if (meta.ipAddress) session.ipAddress = meta.ipAddress;
    await session.save();

    return {
      user: user.toJSON() as SafeUser,
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  /**
   * Logout current session
   */
  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = hashCryptoToken(rawRefreshToken);
    await AuthSession.findOneAndUpdate(
      { refreshTokenHash: tokenHash },
      { revokedAt: new Date() }
    );
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await AuthSession.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  /**
   * Verify email with raw token
   */
  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = hashCryptoToken(rawToken);

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');

    if (!user) {
      throw new AppError(
        'Email verification token is invalid or has expired.',
        400,
        ErrorCodes.ERR_VERIFICATION_TOKEN_INVALID
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    return { message: 'Email has been successfully verified.' };
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Anti-enumeration / graceful response
    if (!user || user.isEmailVerified) {
      return { message: 'If an unverified account exists for this email, a verification link has been sent.' };
    }

    const { rawToken, tokenHash } = generateCryptoToken();
    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    sendVerificationEmail(user.email, rawToken, user.firstName).catch(() => {});

    return { message: 'If an unverified account exists for this email, a verification link has been sent.' };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isActive: true });

    if (user) {
      const { rawToken, tokenHash } = generateCryptoToken();
      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await user.save();

      sendPasswordResetEmail(user.email, rawToken, user.firstName).catch(() => {});
    }

    // Generic response to prevent account enumeration
    return {
      message: 'If an account exists for this email, a password reset link has been sent.',
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordDTO): Promise<{ message: string }> {
    const tokenHash = hashCryptoToken(data.token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      throw new AppError(
        'Password reset token is invalid or has expired.',
        400,
        ErrorCodes.ERR_PASSWORD_RESET_TOKEN_INVALID
      );
    }

    const passwordHash = await hashPassword(data.newPassword);
    user.passwordHash = passwordHash;
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    // Revoke all existing sessions
    await this.logoutAll(user._id.toString());

    return {
      message: 'Password has been successfully reset. Please log in with your new password.',
    };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, data: ChangePasswordDTO): Promise<{ message: string }> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new AppError(
        'Current password is incorrect.',
        400,
        ErrorCodes.ERR_CURRENT_PASSWORD_INVALID
      );
    }

    // Check that new password is not the same as current
    if (data.currentPassword === data.newPassword) {
      throw new AppError(
        'New password cannot be identical to current password.',
        400,
        ErrorCodes.ERR_PASSWORD_SAME_AS_CURRENT
      );
    }

    user.passwordHash = await hashPassword(data.newPassword);
    user.passwordChangedAt = new Date();
    await user.save();

    // Revoke other sessions
    await this.logoutAll(userId);

    return { message: 'Password has been changed successfully.' };
  }

  /**
   * Get current authenticated user
   */
  async getMe(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or disabled', 404, ErrorCodes.NOT_FOUND);
    }
    return user.toJSON() as SafeUser;
  }
}

export const authService = new AuthService();
