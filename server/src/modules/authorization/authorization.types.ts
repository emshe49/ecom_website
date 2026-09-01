import { Role } from './roles.js';
import { Permission } from './permissions.js';

export type { Role, Permission };

export interface RolePermissionsResponse {
  role: Role;
  permissions: Permission[];
}
