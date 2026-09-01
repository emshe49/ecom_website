import { SafeUser } from './user.model.js';

export interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface UserProfileResponse {
  user: SafeUser;
}
