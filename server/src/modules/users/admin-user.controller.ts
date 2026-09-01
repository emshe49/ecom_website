import { Request, Response, NextFunction } from 'express';
import { adminUserService } from './admin-user.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export class AdminUserController {
  async createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await adminUserService.createStaffUser(req.user!.id, req.body);
      sendSuccess(res, { user }, 201);
    } catch (error) {
      next(error);
    }
  }

  async listStaff(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await adminUserService.listStaffUsers();
      sendSuccess(res, { users }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const user = await adminUserService.updateStaffRole(req.user!.id, userId, req.body.role);
      sendSuccess(res, { user }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId as string;
      const user = await adminUserService.updateStaffStatus(
        req.user!.id,
        userId,
        req.body.isActive
      );
      sendSuccess(res, { user }, 200);
    } catch (error) {
      next(error);
    }
  }
}

export const adminUserController = new AdminUserController();
