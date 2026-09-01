import { Role } from './roles.js';
import { Permission } from './permissions.js';
import { ROLE_PERMISSIONS } from './role-permissions.js';

export class AuthorizationService {
  getPermissionsForRole(role: Role): Permission[] {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) {
      return [];
    }
    return [...permissions];
  }

  hasPermission(role: Role, permission: Permission): boolean {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) {
      return false;
    }
    return rolePerms.includes(permission);
  }

  hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) {
      return false;
    }
    return permissions.some((perm) => rolePerms.includes(perm));
  }

  hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) {
      return false;
    }
    return permissions.every((perm) => rolePerms.includes(perm));
  }
}

export const authorizationService = new AuthorizationService();
