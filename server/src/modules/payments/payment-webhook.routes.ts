import { Router } from 'express';
import { paymentWebhookController } from './payment-webhook.controller.js';

const router = Router();

// ==========================================
// Webhook Routes (No JWT Auth, Signature Authenticated)
// ==========================================
router.post('/payments/:provider', paymentWebhookController.handleWebhook);

export const paymentWebhookRoutes = router;
