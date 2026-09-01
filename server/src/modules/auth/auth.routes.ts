import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  authRateLimiter,
  strictAuthRateLimiter,
} from '../../middleware/rate-limit.middleware.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.validation.js';

const router = Router();

// Public routes
router.post(
  '/register',
  strictAuthRateLimiter,
  validateRequest({ body: registerSchema }),
  authController.register
);

router.post(
  '/login',
  strictAuthRateLimiter,
  validateRequest({ body: loginSchema }),
  authController.login
);

router.post('/refresh', authRateLimiter, authController.refresh);

router.post('/logout', authController.logout);

router.post(
  '/verify-email',
  authRateLimiter,
  validateRequest({ body: verifyEmailSchema }),
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  strictAuthRateLimiter,
  validateRequest({ body: resendVerificationSchema }),
  authController.resendVerification
);

router.post(
  '/forgot-password',
  strictAuthRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  strictAuthRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  authController.resetPassword
);

// Authenticated routes
router.get('/me', authenticate, authController.getMe);
router.get('/permissions', authenticate, authController.getPermissions);

router.post(
  '/change-password',
  authenticate,
  validateRequest({ body: changePasswordSchema }),
  authController.changePassword
);

router.post('/logout-all', authenticate, authController.logoutAll);

export const authRouter = router;
