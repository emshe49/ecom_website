import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase limit if we have many listeners
    this.setMaxListeners(20);
  }
}

export const eventBus = new EventBus();

// Define typed event names to avoid typos
export const EVENTS = {
  USER_REGISTERED: 'user.registered',
  ORDER_PLACED: 'order.placed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_CANCELLED: 'order.cancelled',
  PAYMENT_FAILED: 'payment.failed',
  PASSWORD_RESET_REQUESTED: 'user.password_reset_requested',
} as const;
