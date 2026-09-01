import {
  OrderStatus,
  ALLOWED_ORDER_TRANSITIONS,
  CUSTOMER_CANCELLABLE_STATUSES,
  ADMIN_CANCELLABLE_STATUSES,
} from './order.constants.js';
import { IOrder } from './order.model.js';

export const orderStatusService = {
  /**
   * Checks if an Order status can transition from one state to another.
   */
  canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
    const allowed = ALLOWED_ORDER_TRANSITIONS[from] || [];
    return allowed.includes(to);
  },

  /**
   * Returns list of permitted next Order statuses from the current status.
   */
  getAllowedOrderTransitions(from: OrderStatus): OrderStatus[] {
    return [...(ALLOWED_ORDER_TRANSITIONS[from] || [])];
  },

  /**
   * Checks if customer is allowed to cancel their own order.
   */
  canCustomerCancelOrder(order: IOrder): boolean {
    return CUSTOMER_CANCELLABLE_STATUSES.includes(order.status);
  },

  /**
   * Checks if admin is allowed to cancel an order.
   */
  canAdminCancelOrder(order: IOrder): boolean {
    return ADMIN_CANCELLABLE_STATUSES.includes(order.status);
  },
};
