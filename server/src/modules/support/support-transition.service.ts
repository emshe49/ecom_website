import {
  TICKET_STATUS,
  TicketStatus,
  ALLOWED_SUPPORT_STATUS_TRANSITIONS,
  SUPPORT_CONFIG,
} from './support.constants.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { ISupportTicket } from './support.types.js';

export class SupportTransitionService {
  /**
   * Validates whether a state transition from `from` to `to` is allowed.
   */
  canTransition(from: TicketStatus, to: TicketStatus): boolean {
    if (from === to) return true;
    const allowed = ALLOWED_SUPPORT_STATUS_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Enforces transition or throws operational AppError.
   */
  validateTransition(from: TicketStatus, to: TicketStatus): void {
    if (!this.canTransition(from, to)) {
      throw new AppError(
        `Invalid support ticket status transition from '${from}' to '${to}'.`,
        400,
        ErrorCodes.ERR_SUPPORT_INVALID_TRANSITION
      );
    }
  }

  /**
   * Checks if customer can reopen a resolved ticket within the 7-day window.
   */
  canCustomerReopen(ticket: ISupportTicket): { canReopen: boolean; reason?: string } {
    if (ticket.status !== TICKET_STATUS.RESOLVED) {
      return {
        canReopen: false,
        reason: 'Only tickets in RESOLVED status can be reopened by a customer.',
      };
    }

    if (!ticket.resolvedAt) {
      return { canReopen: true };
    }

    const resolvedTime = new Date(ticket.resolvedAt).getTime();
    const now = Date.now();
    const daysSinceResolved = (now - resolvedTime) / (1000 * 60 * 60 * 24);

    if (daysSinceResolved > SUPPORT_CONFIG.REOPEN_WINDOW_DAYS) {
      return {
        canReopen: false,
        reason: `Reopen window of ${SUPPORT_CONFIG.REOPEN_WINDOW_DAYS} days has expired. Please create a new ticket.`,
      };
    }

    return { canReopen: true };
  }

  /**
   * Validates customer reopen or throws ERR_SUPPORT_REOPEN_WINDOW_EXPIRED / ERR_SUPPORT_INVALID_TRANSITION.
   */
  validateCustomerReopen(ticket: ISupportTicket): void {
    const { canReopen, reason } = this.canCustomerReopen(ticket);
    if (!canReopen) {
      if (reason && reason.includes('expired')) {
        throw new AppError(
          reason,
          400,
          ErrorCodes.ERR_SUPPORT_REOPEN_WINDOW_EXPIRED
        );
      }
      throw new AppError(
        reason || 'Cannot reopen ticket.',
        400,
        ErrorCodes.ERR_SUPPORT_INVALID_TRANSITION
      );
    }
  }
}

export const supportTransitionService = new SupportTransitionService();
