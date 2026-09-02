import { eventBus, EVENTS } from '../../shared/events/event-bus.js';
import { emailService } from './email.service.js';
import { EMAIL_TEMPLATES } from './email.constants.js';
import { logger } from '../../shared/utils/logger.js';

export function setupEmailEventHandlers() {
  logger.info('Setting up Email Event Handlers');

  // User Registered Event
  eventBus.on(EVENTS.USER_REGISTERED, async (payload: { userId: string; email: string; name: string; token: string }) => {
    try {
      await emailService.sendTransactionalEmail({
        userId: payload.userId,
        templateId: EMAIL_TEMPLATES.WELCOME_VERIFY,
        recipient: payload.email,
        templateData: {
          name: payload.name,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${payload.token}`
        },
        deduplicationKey: `welcome_${payload.userId}`
      });
    } catch (err: any) {
      logger.error(`Failed to send welcome email for user ${payload.userId}: ${err.message}`);
    }
  });

  // Order Placed Event
  eventBus.on(EVENTS.ORDER_PLACED, async (payload: { userId: string; orderId: string; email: string; name: string; orderNumber: string; total: number }) => {
    try {
      await emailService.sendTransactionalEmail({
        userId: payload.userId,
        templateId: EMAIL_TEMPLATES.ORDER_CONFIRMATION,
        recipient: payload.email,
        templateData: {
          name: payload.name,
          orderNumber: payload.orderNumber,
          total: payload.total.toFixed(2),
          orderUrl: `${process.env.FRONTEND_URL}/orders/${payload.orderId}`
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
        templateId: EMAIL_TEMPLATES.PASSWORD_RESET,
        recipient: payload.email,
        templateData: {
          name: payload.name,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${payload.token}`
        },
        deduplicationKey: `pwd_reset_${payload.token}`
      });
    } catch (err: any) {
      logger.error(`Failed to send password reset email for user ${payload.userId}: ${err.message}`);
    }
  });
}
