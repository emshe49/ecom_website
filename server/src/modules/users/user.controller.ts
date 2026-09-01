import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getMyProfile(req.user!.id);
      sendSuccess(res, { user }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedUser = await userService.updateMyProfile(req.user!.id, req.body);
      sendSuccess(res, { user: updatedUser }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
