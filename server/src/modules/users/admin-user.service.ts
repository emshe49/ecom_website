import { Types } from 'mongoose';
import { User, SafeUser } from './user.model.js';
import { ROLES, Role } from '../authorization/roles.js';
import { CreateStaffDTO } from './admin-user.types.js';
import { UserMapper } from './user.mapper.js';
import { AuthSession } from '../auth/auth-session.model.js';
import {
  generateCryptoToken,
  hashPassword,
} from '../../shared/security/password.service.js';
import { eventBus, EVENTS } from '../../shared/events/event-bus.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { auditService } from '../audit/audit.service.js';
import {
  AUDIT_EVENT_TYPE,
  AUDIT_CATEGORY,
  ACTOR_TYPE,
  AUDIT_OUTCOME,
  TARGET_TYPE,
} from '../audit/audit.constants.js';

export class AdminUserService {
  async createStaffUser(_creatorId: string, dto: CreateStaffDTO): Promise<SafeUser> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw AppError.conflict(
        'A user with this email address already exists.',
        ErrorCodes.ERR_STAFF_EMAIL_ALREADY_EXISTS
      );
    }

    // Generate random secure activation / set-password token
    const { rawToken: rawActivationToken, tokenHash } = generateCryptoToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate temporary strong password hash
    const { rawToken: randomPassword } = generateCryptoToken();
    const tempPasswordHash = await hashPassword(randomPassword);

    const staffUser = new User({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: normalizedEmail,
      passwordHash: tempPasswordHash,
      role: dto.role,
      isEmailVerified: true, // Created by administrative authority
      isActive: true,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    });

    await staffUser.save();

    auditService.recordAuditEvent({
      eventType: AUDIT_EVENT_TYPE.USER_CREATED_BY_ADMIN,
      category: AUDIT_CATEGORY.USER,
      action: 'USER_CREATED_BY_ADMIN',
      actor: {
        actorType: ACTOR_TYPE.ADMIN,
        actorUserId: _creatorId,
      },
      target: {
        targetType: TARGET_TYPE.USER,
        targetId: staffUser._id.toString(),
        targetDisplay: staffUser.email,
      },
      outcome: AUDIT_OUTCOME.SUCCESS,
      after: {
        email: staffUser.email,
        role: staffUser.role,
        firstName: staffUser.firstName,
        lastName: staffUser.lastName,
      },
    }).catch(() => {});

    // Send account setup email
    eventBus.emit(EVENTS.PASSWORD_RESET_REQUESTED, {
      userId: staffUser._id.toString(),
      email: staffUser.email,
      name: staffUser.firstName,
      token: rawActivationToken,
    });

    return UserMapper.toSafeUser(staffUser);
  }

  async listStaffUsers(): Promise<SafeUser[]> {
    const staffUsers = await User.find({
      role: { $ne: ROLES.CUSTOMER },
    }).sort({ createdAt: -1 });

    return staffUsers.map((user) => UserMapper.toSafeUser(user));
  }

  async updateStaffRole(updaterId: string, targetUserId: string, newRole: Role): Promise<SafeUser> {
    if (updaterId === targetUserId) {
      throw AppError.badRequest(
        'You cannot change your own role.',
        ErrorCodes.ERR_CANNOT_CHANGE_OWN_ROLE
      );
    }

    const userObjectId = new Types.ObjectId(targetUserId);
    const user = await User.findById(userObjectId);
    if (!user || user.role === ROLES.CUSTOMER) {
      throw AppError.notFound('Staff user not found.', ErrorCodes.ERR_ADMIN_USER_NOT_FOUND);
    }

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    auditService.recordAuditEvent({
      eventType: AUDIT_EVENT_TYPE.RBAC_ROLE_CHANGED,
      category: AUDIT_CATEGORY.RBAC,
      action: 'ROLE_CHANGED',
      actor: {
        actorType: ACTOR_TYPE.ADMIN,
        actorUserId: updaterId,
      },
      target: {
        targetType: TARGET_TYPE.USER,
        targetId: user._id.toString(),
        targetDisplay: user.email,
      },
      outcome: AUDIT_OUTCOME.SUCCESS,
      before: { role: oldRole },
      after: { role: newRole },
      changedFields: ['role'],
    }).catch(() => {});

    // Revoke all active sessions for this user to enforce role update across devices
    await AuthSession.updateMany(
      { userId: userObjectId, revokedAt: null },
      { revokedAt: new Date() }
    );

    return UserMapper.toSafeUser(user);
  }

  async updateStaffStatus(
    updaterId: string,
    targetUserId: string,
    isActive: boolean
  ): Promise<SafeUser> {
    if (updaterId === targetUserId && !isActive) {
      throw AppError.badRequest(
        'You cannot disable your own account.',
        ErrorCodes.ERR_CANNOT_DISABLE_SELF
      );
    }

    const userObjectId = new Types.ObjectId(targetUserId);
    const user = await User.findById(userObjectId);
    if (!user || user.role === ROLES.CUSTOMER) {
      throw AppError.notFound('Staff user not found.', ErrorCodes.ERR_ADMIN_USER_NOT_FOUND);
    }

    const oldStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    auditService.recordAuditEvent({
      eventType: AUDIT_EVENT_TYPE.USER_STATUS_CHANGED,
      category: AUDIT_CATEGORY.USER,
      action: 'STATUS_CHANGED',
      actor: {
        actorType: ACTOR_TYPE.ADMIN,
        actorUserId: updaterId,
      },
      target: {
        targetType: TARGET_TYPE.USER,
        targetId: user._id.toString(),
        targetDisplay: user.email,
      },
      outcome: AUDIT_OUTCOME.SUCCESS,
      before: { isActive: oldStatus },
      after: { isActive },
      changedFields: ['isActive'],
    }).catch(() => {});

    // If disabled, revoke all active sessions immediately
    if (!isActive) {
      await AuthSession.updateMany(
        { userId: userObjectId, revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    return UserMapper.toSafeUser(user);
  }
}

export const adminUserService = new AdminUserService();
