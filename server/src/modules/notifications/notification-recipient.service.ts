import { User } from '../users/user.model.js';
import { ROLE_PERMISSIONS } from '../authorization/role-permissions.js';
import { Role } from '../authorization/roles.js';
import { Permission } from '../authorization/permissions.js';

export const notificationRecipientService = {
  /**
   * Finds active staff user IDs whose role grants the specified permission.
   */
  async findStaffUsersWithPermission(permission: Permission): Promise<string[]> {
    const eligibleRoles = (Object.keys(ROLE_PERMISSIONS) as Role[]).filter((role) =>
      ROLE_PERMISSIONS[role].includes(permission)
    );

    if (eligibleRoles.length === 0) {
      return [];
    }

    const users = await User.find(
      {
        role: { $in: eligibleRoles },
        isActive: { $ne: false },
      },
      { _id: 1 }
    ).lean();

    return users.map((u) => u._id.toString());
  },
};
