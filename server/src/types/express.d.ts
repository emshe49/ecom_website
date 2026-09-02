import { UserRoleType } from '../modules/users/user.model.js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        role: UserRoleType;
        email: string;
      };
    }
  }
}

export {};
