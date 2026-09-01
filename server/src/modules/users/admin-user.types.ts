import { Role } from '../authorization/roles.js';
import { SafeUser } from './user.model.js';

export interface CreateStaffDTO {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

export interface UpdateStaffRoleDTO {
  role: Role;
}

export interface UpdateStaffStatusDTO {
  isActive: boolean;
}

export interface StaffUserResponse {
  user: SafeUser;
}

export interface StaffListResponse {
  users: SafeUser[];
}
