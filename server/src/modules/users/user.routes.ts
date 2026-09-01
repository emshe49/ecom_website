import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { updateProfileSchema } from './user.validation.js';

const router = Router();

// All user profile routes require authentication
router.use(authenticate);

router.get('/me', (req, res, next) => userController.getMe(req, res, next));
router.patch(
  '/me',
  validateRequest({ body: updateProfileSchema }),
  (req, res, next) => userController.updateMe(req, res, next)
);

export const userRouter = router;
