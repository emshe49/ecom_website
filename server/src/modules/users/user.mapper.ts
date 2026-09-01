import { IUser, SafeUser } from './user.model.js';

export class UserMapper {
  static toSafeUser(user: IUser): SafeUser {
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || null,
      avatarUrl: user.avatarUrl || null,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
