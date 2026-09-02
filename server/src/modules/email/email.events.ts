import { eventBus, EVENTS } from '../../shared/events/event-bus.js';
import { emailService } from './email.service.js';
import { TEMPLATES } from './email-template-registry.js';
import { logger } from '../../shared/utils/logger.js';

export function setupEmailEventHandlers() {
  logger.info('Setting up Email Event Handlers');

  // User Registered Event
  eventBus.on(EVENTS.USER_REGISTERED, async (payload: { userId: string; email: string; name: string; token: string }) => {
    try {
      await emailService.sendTransactionalEmail({
        userId: payload.userId,
        templateId: TEMPLATES.AUTH_VERIFY_EMAIL.id,
        recipient: payload.email,
        data: {
          url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${payload.token}`
        },
        deduplicationKey: `welcome_${payload.userId}`
      });
    } catch (err: any) {
      logger.error(`Failed to send welcome email for user ${payload.userId}: ${err.message}`);
    }
  });

  // Order Placed Event
  eventBus.on(EVENTS.ORDER_PLACED, async (payload: { userId: string; orderId: string; email: string; name: string; orderNumber: string; total: number; currency?: string }) => {
    try {
      await emailService.sendTransactionalEmail({
        userId: payload.userId,
        templateId: TEMPLATES.ORDER_PLACED.id,
        recipient: payload.email,
        data: {
          customerName: payload.name,
          orderNumber: payload.orderNumber,
          total: payload.total,
          currency: payload.currency || 'USD',
          orderUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${payload.orderId}`
        },
        deduplicationKey: `order_placed_${payload.orderId}`
      });
    } catch (err: any) {
      logger.error(`Failed to send order confirmation email for order ${payload.orderId}: ${err.message}`);
    }
  });
  
  // Password Reset Event
  eventBus.on(EVENTS.PASSWORD_RESET_REQUESTED, async (payload: { userId: string; email: string; name: string; token: string }) => {
    try {
      await emailService.sendTransactionalEmail({
        userId: payload.userId,
        templateId: TEMPLATES.AUTH_PASSWORD_RESET.id,
        recipient: payload.email,
        data: {
          url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${payload.token}`
        },
        deduplicationKey: `pwd_reset_${payload.token}`
      });
    } catch (err: any) {
      logger.error(`Failed to send password reset email for user ${payload.userId}: ${err.message}`);
    }
  });
}
