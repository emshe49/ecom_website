import { User, SafeUser } from './user.model.js';
import { UpdateProfileDTO } from './user.types.js';
import { UserMapper } from './user.mapper.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export class UserService {
  async getMyProfile(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.ERR_USER_NOT_FOUND);
    }
    return UserMapper.toSafeUser(user);
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDTO): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User profile not found.', ErrorCodes.ERR_USER_NOT_FOUND);
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }

    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }

    await user.save();
    return UserMapper.toSafeUser(user);
  }
}

export const userService = new UserService();
