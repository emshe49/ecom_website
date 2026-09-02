import { Router } from 'express';
import { emailController } from './email.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/preferences', emailController.getMyPreferences);
router.put('/preferences', emailController.updateMyPreferences);

export default router;
