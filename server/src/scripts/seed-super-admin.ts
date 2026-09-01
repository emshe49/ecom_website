import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../modules/users/user.model.js';
import { ROLES } from '../modules/authorization/roles.js';
import { hashPassword } from '../shared/security/password.service.js';
import { logger } from '../shared/utils/logger.js';

async function seedSuperAdmin(): Promise<void> {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@ecom.local').trim().toLowerCase();
  const firstName = (process.env.SUPER_ADMIN_FIRST_NAME || 'Super').trim();
  const lastName = (process.env.SUPER_ADMIN_LAST_NAME || 'Admin').trim();
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';

  logger.info(`Connecting to database at: ${env.MONGODB_URI}`);
  await mongoose.connect(env.MONGODB_URI);

  try {
    const existing = await User.findOne({ email });
    const passwordHash = await hashPassword(password);

    if (existing) {
      existing.firstName = firstName;
      existing.lastName = lastName;
      existing.role = ROLES.SUPER_ADMIN;
      existing.isEmailVerified = true;
      existing.isActive = true;
      existing.passwordHash = passwordHash;
      await existing.save();
      logger.info(`Existing user '${email}' promoted/updated as SUPER_ADMIN successfully.`);
    } else {
      const superAdmin = new User({
        firstName,
        lastName,
        email,
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        isEmailVerified: true,
        isActive: true,
      });
      await superAdmin.save();
      logger.info(`New SUPER_ADMIN user '${email}' created successfully.`);
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to seed SUPER_ADMIN user: ${errMessage}`, 'Seed');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Database disconnected cleanly.');
  }
}

seedSuperAdmin();
