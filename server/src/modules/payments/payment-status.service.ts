import {
  PAYMENT_STATUS,
  PAYMENT_ATTEMPT_STATUS,
  PaymentStatus,
  PaymentAttemptStatus,
} from './payment.constants.js';
import { IPaymentAttemptDocument } from './payment-attempt.model.js';

export const paymentStatusService = {
  /**
   * Recalculates the aggregate Payment status based on its historical attempts.
   * Rules:
   * 1. If any attempt is SUCCEEDED => Payment is SUCCEEDED (Final!)
   * 2. If any attempt is PROCESSING => Payment is PROCESSING
   * 3. If any attempt is PENDING => Payment is PENDING
   * 4. If all attempts are FAILED => Payment is FAILED
   * 5. If all attempts are CANCELLED => Payment is CANCELLED
   * 6. Default to CREATED
   */
  deriveAggregateStatus(attempts: IPaymentAttemptDocument[]): PaymentStatus {
    if (!attempts || attempts.length === 0) {
      return PAYMENT_STATUS.CREATED;
    }

    const hasSucceeded = attempts.some(
      (a) => a.status === PAYMENT_ATTEMPT_STATUS.SUCCEEDED
    );
    if (hasSucceeded) {
      return PAYMENT_STATUS.SUCCEEDED;
    }

    const hasProcessing = attempts.some(
      (a) => a.status === PAYMENT_ATTEMPT_STATUS.PROCESSING
    );
    if (hasProcessing) {
      return PAYMENT_STATUS.PROCESSING;
    }

    const hasPending = attempts.some(
      (a) => a.status === PAYMENT_ATTEMPT_STATUS.PENDING
    );
    if (hasPending) {
      return PAYMENT_STATUS.PENDING;
    }

    const latest = attempts[0]; // sorted by createdAt / attemptNumber desc
    if (latest) {
      if (latest.status === PAYMENT_ATTEMPT_STATUS.FAILED) {
        return PAYMENT_STATUS.FAILED;
      }
      if (latest.status === PAYMENT_ATTEMPT_STATUS.CANCELLED) {
        return PAYMENT_STATUS.CANCELLED;
      }
      if (latest.status === PAYMENT_ATTEMPT_STATUS.EXPIRED) {
        return PAYMENT_STATUS.EXPIRED;
      }
    }

    return PAYMENT_STATUS.CREATED;
  },

  /**
   * Validates whether an attempt status can transition to a new status.
   * SUCCEEDED is final and cannot be downgraded.
   */
  canTransitionAttempt(
    current: PaymentAttemptStatus,
    next: PaymentAttemptStatus
  ): boolean {
    if (current === PAYMENT_ATTEMPT_STATUS.SUCCEEDED) {
      return false; // SUCCEEDED is immutable terminal state
    }

    if (
      current === PAYMENT_ATTEMPT_STATUS.FAILED ||
      current === PAYMENT_ATTEMPT_STATUS.CANCELLED ||
      current === PAYMENT_ATTEMPT_STATUS.EXPIRED
    ) {
      return false; // Already terminated
    }

    if (current === PAYMENT_ATTEMPT_STATUS.PENDING) {
      const allowed: PaymentAttemptStatus[] = [
        PAYMENT_ATTEMPT_STATUS.PROCESSING,
        PAYMENT_ATTEMPT_STATUS.SUCCEEDED,
        PAYMENT_ATTEMPT_STATUS.FAILED,
        PAYMENT_ATTEMPT_STATUS.CANCELLED,
        PAYMENT_ATTEMPT_STATUS.EXPIRED,
      ];
      return allowed.includes(next);
    }

    if (current === PAYMENT_ATTEMPT_STATUS.PROCESSING) {
      const allowed: PaymentAttemptStatus[] = [
        PAYMENT_ATTEMPT_STATUS.SUCCEEDED,
        PAYMENT_ATTEMPT_STATUS.FAILED,
        PAYMENT_ATTEMPT_STATUS.CANCELLED,
      ];
      return allowed.includes(next);
    }


    return false;
  },
};
