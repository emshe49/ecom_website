import { Router } from 'express';
import { adminEmailController } from './admin-email.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/messages', adminEmailController.listEmails);
router.get('/messages/:id', adminEmailController.getEmailDetails);
router.post('/messages/:id/retry', adminEmailController.retryEmail);

export default router;
