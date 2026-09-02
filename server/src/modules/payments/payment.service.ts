import { Types } from 'mongoose';
import { Payment, IPaymentDocument } from './payment.model.js';
import { PaymentAttempt, IPaymentAttemptDocument } from './payment-attempt.model.js';

import { PaymentWebhookEvent } from './payment-webhook-event.model.js';
import { Order } from '../orders/order.model.js';
import {
  ORDER_STATUS,
  PAYMENT_STATUS as ORDER_PAYMENT_STATUS,
} from '../orders/order.constants.js';
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_ATTEMPT_STATUS,
  WEBHOOK_STATUS,
  MAX_PAYMENT_ATTEMPTS_PER_ORDER,
  PaymentProvider,
} from './payment.constants.js';
import {
  InitiatePaymentInput,
  AdminPaymentQueryInput,
  ConfirmCodInput,
} from './payment.validation.js';
import {
  PaymentDTO,
  InitiatePaymentResultDTO,
  AdminPaymentListItemDTO,
  AdminPaymentDetailDTO,
} from './payment.types.js';
import { paymentNumberService } from './payment-number.service.js';
import { paymentStatusService } from './payment-status.service.js';
import { providerRegistry } from './providers/provider-registry.js';
import { paymentMapper } from './payment.mapper.js';
import { notificationService } from '../notifications/notification.service.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';
import { logger } from '../../shared/utils/logger.js';
import { auditService } from '../audit/audit.service.js';
import {
  AUDIT_EVENT_TYPE,
  AUDIT_CATEGORY,
  ACTOR_TYPE,
  AUDIT_OUTCOME,
  TARGET_TYPE,
} from '../audit/audit.constants.js';

export const paymentService = {
  /**
   * Get available enabled payment methods.
   */
  async getPaymentMethods() {
    return {
      methods: [
        {
          code: PAYMENT_METHOD.ONLINE,
          name: 'Online Payment',
          description: 'Pay instantly via debit/credit card or net banking',
          enabled: true,
          provider: 'TEST',
        },
        {
          code: PAYMENT_METHOD.CASH_ON_DELIVERY,
          name: 'Cash on Delivery',
          description: 'Pay with cash upon package delivery',
          enabled: true,
          provider: 'COD',
        },
      ],
    };
  },

  /**
   * Customer: Initiate Payment for an existing, payable order.
   */
  async initiatePayment(
    userId: string,
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentResultDTO> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(input.orderId)) {
      throw AppError.badRequest('Invalid ID format', ErrorCodes.VALIDATION_ERROR);
    }


    const userObjId = new Types.ObjectId(userId);
    const orderObjId = new Types.ObjectId(input.orderId);

    // 1. Authoritative Order Lookup: isolated to requesting customer
    const order = await Order.findOne({
      _id: orderObjId,
      userId: userObjId,
    });

    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    // 2. State & Payable Invariants
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw AppError.badRequest(
        'Cannot initiate payment for a cancelled order.',
        ErrorCodes.ERR_PAYMENT_ORDER_NOT_PAYABLE
      );
    }

    if (order.paymentStatus === ORDER_PAYMENT_STATUS.PAID) {
      throw AppError.conflict(
        'This order is already paid.',
        ErrorCodes.ERR_PAYMENT_ORDER_ALREADY_PAID
      );
    }

    const payableOrderStatuses = [
      ORDER_STATUS.PLACED,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PROCESSING,
      ORDER_STATUS.READY_TO_SHIP,
      ORDER_STATUS.SHIPPED,
    ];

    if (!payableOrderStatuses.includes(order.status as any)) {
      throw AppError.badRequest(
        `Order in '${order.status}' status is not in a payable state.`,
        ErrorCodes.ERR_PAYMENT_ORDER_NOT_PAYABLE
      );
    }

    const provider = providerRegistry.resolveProviderForMethod(input.method);

    // 3. Find or Create the unique Payment aggregate for this order
    let payment = await Payment.findOne({ orderId: orderObjId });

    if (!payment) {
      const paymentNumber = await paymentNumberService.generatePaymentNumber();
      payment = new Payment({
        orderId: orderObjId,
        userId: userObjId,
        paymentNumber,
        amount: order.total, // Authoritative from Order
        currency: order.currency, // Authoritative from Order
        method: input.method,
        status: PAYMENT_STATUS.CREATED,
        provider: provider.providerName,
      });
      await payment.save();
    } else {
      // If payment already exists, update method & provider if customer changed payment option
      if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
        throw AppError.conflict(
          'Payment for this order has already succeeded.',
          ErrorCodes.ERR_PAYMENT_ALREADY_SUCCEEDED
        );
      }
      payment.method = input.method;
      payment.provider = provider.providerName;
      payment.amount = order.total; // Ensure sync with order total
      payment.currency = order.currency;
      await payment.save();
    }

    // 4. Check for existing active attempt (Concurrency / Duplicate Prevention)
    const existingActiveAttempt = await PaymentAttempt.findOne({
      paymentId: payment._id,
      provider: provider.providerName,
      status: {
        $in: [PAYMENT_ATTEMPT_STATUS.PENDING, PAYMENT_ATTEMPT_STATUS.PROCESSING],
      },
    }).sort({ attemptNumber: -1 });

    if (existingActiveAttempt) {
      const allAttempts = await PaymentAttempt.find({
        paymentId: payment._id,
      }).sort({ attemptNumber: -1 });

      return {
        payment: paymentMapper.toPaymentDTO(payment, allAttempts),
        attempt: paymentMapper.toAttemptDTO(existingActiveAttempt),
        checkoutUrl: existingActiveAttempt.checkoutUrl,
        clientToken: existingActiveAttempt.clientToken,
      };
    }

    // 5. Attempt Count Limit Enforcement
    const attemptCount = await PaymentAttempt.countDocuments({
      paymentId: payment._id,
    });

    if (attemptCount >= MAX_PAYMENT_ATTEMPTS_PER_ORDER) {
      throw AppError.badRequest(
        `Maximum payment attempt limit (${MAX_PAYMENT_ATTEMPTS_PER_ORDER}) exceeded for this order. Please contact customer support.`,
        ErrorCodes.ERR_PAYMENT_ATTEMPT_LIMIT
      );
    }

    const nextAttemptNumber = attemptCount + 1;

    // 6. Create new immutable PaymentAttempt
    const newAttempt = new PaymentAttempt({
      paymentId: payment._id,
      orderId: orderObjId,
      userId: userObjId,
      attemptNumber: nextAttemptNumber,
      provider: provider.providerName,
      method: input.method,
      status: PAYMENT_ATTEMPT_STATUS.PENDING,
      amount: order.total,
      currency: order.currency,
      initiatedAt: new Date(),
    });
    await newAttempt.save();

    // 7. Call Provider
    const providerResult = await provider.createPayment({
      paymentId: payment._id.toString(),
      paymentNumber: payment.paymentNumber,
      attemptId: newAttempt._id.toString(),
      attemptNumber: newAttempt.attemptNumber,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: userId,
      amount: order.total,
      currency: order.currency,
      method: input.method,
    });

    newAttempt.providerPaymentId = providerResult.providerPaymentId;
    newAttempt.providerTransactionId = providerResult.providerTransactionId;
    newAttempt.providerReference = providerResult.providerReference;
    newAttempt.checkoutUrl = providerResult.checkoutUrl;
    newAttempt.clientToken = providerResult.clientToken;
    newAttempt.status = providerResult.status;
    await newAttempt.save();

    // Update aggregate Payment status
    const allAttempts = await PaymentAttempt.find({
      paymentId: payment._id,
    }).sort({ attemptNumber: -1 });

    payment.status = paymentStatusService.deriveAggregateStatus(allAttempts);
    payment.providerReference = providerResult.providerReference;
    await payment.save();

    // If COD, update Order paymentStatus to PENDING
    if (input.method === PAYMENT_METHOD.CASH_ON_DELIVERY) {
      await Order.findByIdAndUpdate(orderObjId, {
        $set: { paymentStatus: ORDER_PAYMENT_STATUS.PENDING },
      });
    }

    logger.info(
      `Payment attempt #${nextAttemptNumber} initiated for Order ${order.orderNumber} via ${input.method} (${provider.providerName})`
    );

    return {
      payment: paymentMapper.toPaymentDTO(payment, allAttempts),
      attempt: paymentMapper.toAttemptDTO(newAttempt),
      checkoutUrl: providerResult.checkoutUrl,
      clientToken: providerResult.clientToken,
    };
  },

  /**
   * Customer: Get payment details for an order.
   */
  async getPaymentByOrderId(
    userId: string,
    orderId: string
  ): Promise<PaymentDTO | null> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(orderId)) {
      throw AppError.badRequest('Invalid ID format', ErrorCodes.VALIDATION_ERROR);
    }


    const orderObjId = new Types.ObjectId(orderId);
    const userObjId = new Types.ObjectId(userId);

    const order = await Order.findOne({
      _id: orderObjId,
      userId: userObjId,
    });

    if (!order) {
      throw AppError.notFound('Order not found.', ErrorCodes.ERR_ORDER_NOT_FOUND);
    }

    const payment = await Payment.findOne({ orderId: orderObjId });
    if (!payment) {
      return null;
    }

    const attempts = await PaymentAttempt.find({
      paymentId: payment._id,
    }).sort({ attemptNumber: -1 });

    return paymentMapper.toPaymentDTO(payment, attempts);
  },

  /**
   * Centralized Mark Payment Succeeded (Atomically updates Attempt, Payment, and Order).
   */
  async markPaymentSucceeded(
    paymentId: Types.ObjectId | string,
    attemptId?: Types.ObjectId | string,
    providerTransactionId?: string,
    providerReference?: string
  ): Promise<void> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      logger.warn(`markPaymentSucceeded: Payment ${paymentId} not found`);
      return;
    }

    const now = new Date();

    // Update specific or latest attempt
    if (attemptId) {
      await PaymentAttempt.findByIdAndUpdate(attemptId, {
        $set: {
          status: PAYMENT_ATTEMPT_STATUS.SUCCEEDED,
          completedAt: now,
          providerTransactionId:
            providerTransactionId || payment.providerTransactionId,
          providerReference: providerReference || payment.providerReference,
        },
      });
    }

    // Update aggregate Payment
    payment.status = PAYMENT_STATUS.SUCCEEDED;
    payment.paidAt = now;
    if (providerTransactionId) {
      payment.providerTransactionId = providerTransactionId;
    }
    if (providerReference) {
      payment.providerReference = providerReference;
    }
    await payment.save();

    // Update Order paymentStatus to PAID
    const order = await Order.findByIdAndUpdate(
      payment.orderId,
      {
        $set: {
          paymentStatus: ORDER_PAYMENT_STATUS.PAID,
        },
      },
      { new: true }
    );

    if (order) {
      notificationService
        .notifyPaymentEvent(
          order.userId.toString(),
          order._id.toString(),
          order.orderNumber,
          payment._id.toString(),
          'SUCCEEDED',
          payment.amount,
          payment.currency
        )
        .catch((err) =>
          logger.error(`Payment success notification failed: ${err.message}`)
        );
    }

    logger.info(
      `Payment ${payment.paymentNumber} marked SUCCEEDED for Order ${payment.orderId}`
    );
  },

  /**
   * Centralized Mark Payment Failed (Preserves history and prevents downgrading PAID orders).
   */
  async markPaymentFailed(
    paymentId: Types.ObjectId | string,
    attemptId?: Types.ObjectId | string,
    failureCode?: string,
    failureMessage?: string
  ): Promise<void> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      logger.warn(`markPaymentFailed: Payment ${paymentId} not found`);
      return;
    }

    // Guard: Never downgrade already SUCCEEDED payment or PAID order
    if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
      logger.warn(
        `Ignored markPaymentFailed on already SUCCEEDED payment ${payment.paymentNumber}`
      );
      return;
    }

    const now = new Date();

    if (attemptId) {
      await PaymentAttempt.findByIdAndUpdate(attemptId, {
        $set: {
          status: PAYMENT_ATTEMPT_STATUS.FAILED,
          failureCode,
          failureMessage,
          completedAt: now,
        },
      });
    }

    const allAttempts = await PaymentAttempt.find({
      paymentId: payment._id,
    }).sort({ attemptNumber: -1 });

    const newStatus = paymentStatusService.deriveAggregateStatus(allAttempts);
    payment.status = newStatus;
    payment.failedAt = now;
    await payment.save();

    // Only update Order paymentStatus to FAILED if not already PAID
    const order = await Order.findById(payment.orderId);
    if (order && order.paymentStatus !== ORDER_PAYMENT_STATUS.PAID) {
      if (newStatus === PAYMENT_STATUS.FAILED) {
        order.paymentStatus = ORDER_PAYMENT_STATUS.FAILED;
        await order.save();
      }
    }

    logger.info(
      `Payment attempt failed on ${payment.paymentNumber}: [${failureCode}] ${failureMessage}`
    );

    if (order) {
      notificationService
        .notifyPaymentEvent(
          order.userId.toString(),
          order._id.toString(),
          order.orderNumber,
          payment._id.toString(),
          'FAILED',
          payment.amount,
          payment.currency,
          attemptId ? attemptId.toString() : undefined
        )
        .catch((err) =>
          logger.error(`Payment failed notification failed: ${err.message}`)
        );
    }
  },

  /**
   * Centralized Mark Payment Cancelled.
   */
  async markPaymentCancelled(
    paymentId: Types.ObjectId | string,
    attemptId?: Types.ObjectId | string
  ): Promise<void> {
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status === PAYMENT_STATUS.SUCCEEDED) {
      return;
    }

    const now = new Date();
    if (attemptId) {
      await PaymentAttempt.findByIdAndUpdate(attemptId, {
        $set: {
          status: PAYMENT_ATTEMPT_STATUS.CANCELLED,
          completedAt: now,
        },
      });
    }

    const allAttempts = await PaymentAttempt.find({
      paymentId: payment._id,
    }).sort({ attemptNumber: -1 });

    payment.status = paymentStatusService.deriveAggregateStatus(allAttempts);
    payment.cancelledAt = now;
    await payment.save();
  },

  /**
   * Webhook Processor (Signature Verification + Event Idempotency + Order Settlement).
   */
  async processWebhook(
    providerName: string,
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
    body: any
  ): Promise<{ received: boolean; status: string }> {
    const providerEnum = providerName.toUpperCase() as PaymentProvider;
    const provider = providerRegistry.getProvider(providerEnum);

    // 1. Verify Cryptographic Webhook Signature
    const verification = await provider.verifyWebhook(rawBody, headers);
    if (!verification.isValid) {
      logger.warn(
        `Webhook signature verification failed for provider ${providerName}: ${verification.error}`
      );
      throw AppError.unauthorized(
        verification.error || 'Invalid webhook signature',
        ErrorCodes.ERR_PAYMENT_INVALID_SIGNATURE
      );
    }

    // 2. Parse Event Payload
    const parsedEvent = await provider.parseWebhook(body, headers);

    // 3. Check Event Idempotency in database
    const existingEvent = await PaymentWebhookEvent.findOne({
      provider: providerEnum,
      providerEventId: parsedEvent.providerEventId,
    });

    if (existingEvent && existingEvent.processingStatus === WEBHOOK_STATUS.PROCESSED) {
      logger.info(
        `Webhook event ${parsedEvent.providerEventId} already processed (idempotent ignore)`
      );
      return { received: true, status: 'IDEMPOTENT_IGNORE' };
    }

    // Record or update webhook event entry
    let webhookEventDoc = existingEvent;
    if (!webhookEventDoc) {
      webhookEventDoc = new PaymentWebhookEvent({
        provider: providerEnum,
        providerEventId: parsedEvent.providerEventId,
        eventType: parsedEvent.eventType,
        processingStatus: WEBHOOK_STATUS.RECEIVED,
        receivedAt: new Date(),
      });
      await webhookEventDoc.save();
    }

    // 4. Locate Target Payment and Attempt
    let attempt: IPaymentAttemptDocument | null = null;
    if (parsedEvent.attemptId && Types.ObjectId.isValid(parsedEvent.attemptId)) {
      attempt = await PaymentAttempt.findById(parsedEvent.attemptId);
    } else if (parsedEvent.providerPaymentId) {
      attempt = await PaymentAttempt.findOne({
        provider: providerEnum,
        providerPaymentId: parsedEvent.providerPaymentId,
      });
    }

    let payment: IPaymentDocument | null = null;
    if (attempt) {
      payment = await Payment.findById(attempt.paymentId);
      webhookEventDoc.attemptId = attempt._id;
      webhookEventDoc.paymentId = attempt.paymentId;
    } else if (parsedEvent.paymentId && Types.ObjectId.isValid(parsedEvent.paymentId)) {
      payment = await Payment.findById(parsedEvent.paymentId);
      if (payment) {
        webhookEventDoc.paymentId = payment._id;
      }
    }

    if (!payment) {
      logger.warn(
        `Webhook received for unknown payment / attempt (provider: ${providerName}, eventId: ${parsedEvent.providerEventId})`
      );
      webhookEventDoc.processingStatus = WEBHOOK_STATUS.IGNORED;
      webhookEventDoc.error = 'Unknown payment reference';
      await webhookEventDoc.save();
      return { received: true, status: 'IGNORED_UNKNOWN_PAYMENT' };
    }

    // 5. Apply Status Transition
    try {
      if (parsedEvent.status === 'SUCCEEDED') {
        await this.markPaymentSucceeded(
          payment._id,
          attempt?._id,
          parsedEvent.providerTransactionId,
          parsedEvent.providerPaymentId
        );

        auditService.recordAuditEvent({
          eventType: AUDIT_EVENT_TYPE.PAYMENT_SUCCEEDED,
          category: AUDIT_CATEGORY.PAYMENT,
          action: 'PAYMENT_SUCCEEDED',
          actor: {
            actorType: ACTOR_TYPE.WEBHOOK,
            actorUserId: null,
          },
          target: {
            targetType: TARGET_TYPE.PAYMENT,
            targetId: payment._id.toString(),
            targetDisplay: payment.paymentNumber,
          },
          outcome: AUDIT_OUTCOME.SUCCESS,
          metadata: {
            provider: providerName,
            providerEventId: parsedEvent.providerEventId,
            amount: payment.amount,
            currency: payment.currency,
          },
        }).catch(() => {});
      } else if (parsedEvent.status === 'FAILED') {
        await this.markPaymentFailed(
          payment._id,
          attempt?._id,
          parsedEvent.failureCode,
          parsedEvent.failureMessage
        );

        auditService.recordAuditEvent({
          eventType: AUDIT_EVENT_TYPE.PAYMENT_FAILED,
          category: AUDIT_CATEGORY.PAYMENT,
          action: 'PAYMENT_FAILED',
          actor: {
            actorType: ACTOR_TYPE.WEBHOOK,
            actorUserId: null,
          },
          target: {
            targetType: TARGET_TYPE.PAYMENT,
            targetId: payment._id.toString(),
            targetDisplay: payment.paymentNumber,
          },
          outcome: AUDIT_OUTCOME.FAILURE,
          failureCode: parsedEvent.failureCode || 'ERR_PAYMENT_FAILED',
          metadata: {
            provider: providerName,
            providerEventId: parsedEvent.providerEventId,
          },
        }).catch(() => {});
      } else if (parsedEvent.status === 'CANCELLED') {
        await this.markPaymentCancelled(payment._id, attempt?._id);
      }

      webhookEventDoc.processingStatus = WEBHOOK_STATUS.PROCESSED;
      webhookEventDoc.processedAt = new Date();
      await webhookEventDoc.save();

      return { received: true, status: 'PROCESSED' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      webhookEventDoc.processingStatus = WEBHOOK_STATUS.FAILED;
      webhookEventDoc.error = msg;
      await webhookEventDoc.save();
      throw err;
    }
  },

  /**
   * Admin: Confirm Cash on Delivery collection upon package delivery.
   */
  async confirmCodPayment(
    paymentId: string,
    adminId: string,
    input: ConfirmCodInput
  ): Promise<AdminPaymentDetailDTO> {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw AppError.notFound('Payment not found', ErrorCodes.ERR_PAYMENT_NOT_FOUND);
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw AppError.notFound('Payment not found', ErrorCodes.ERR_PAYMENT_NOT_FOUND);
    }

    if (payment.method !== PAYMENT_METHOD.CASH_ON_DELIVERY) {
      throw AppError.badRequest(
        'Manual collection confirmation is only valid for Cash on Delivery payments.',
        ErrorCodes.ERR_PAYMENT_INVALID_ACTION
      );
    }

    if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
      throw AppError.conflict(
        'Payment is already marked as collected/succeeded.',
        ErrorCodes.ERR_PAYMENT_ALREADY_SUCCEEDED
      );
    }

    const now = new Date();
    payment.status = PAYMENT_STATUS.SUCCEEDED;
    payment.paidAt = now;
    payment.providerReference = `COD-CONFIRMED-BY-${adminId}`;
    await payment.save();

    // Mark attempt succeeded
    const latestAttempt = await PaymentAttempt.findOne({
      paymentId: payment._id,
    }).sort({ attemptNumber: -1 });

    if (latestAttempt) {
      latestAttempt.status = PAYMENT_ATTEMPT_STATUS.SUCCEEDED;
      latestAttempt.completedAt = now;
      if (input.note) {
        latestAttempt.failureMessage = input.note; // reused for confirmation notes
      }
      await latestAttempt.save();
    }

    // Update Order paymentStatus to PAID
    await Order.findByIdAndUpdate(payment.orderId, {
      $set: { paymentStatus: ORDER_PAYMENT_STATUS.PAID },
    });

    logger.info(
      `Admin ${adminId} confirmed COD payment collection for Payment ${payment.paymentNumber}`
    );

    auditService.recordAuditEvent({
      eventType: AUDIT_EVENT_TYPE.PAYMENT_COD_CONFIRMED,
      category: AUDIT_CATEGORY.PAYMENT,
      action: 'COD_CONFIRMED',
      actor: {
        actorType: ACTOR_TYPE.ADMIN,
        actorUserId: adminId,
      },
      target: {
        targetType: TARGET_TYPE.PAYMENT,
        targetId: payment._id.toString(),
        targetDisplay: payment.paymentNumber,
      },
      outcome: AUDIT_OUTCOME.SUCCESS,
      after: {
        status: PAYMENT_STATUS.SUCCEEDED,
        amount: payment.amount,
      },
      metadata: {
        orderId: payment.orderId.toString(),
        note: input.note || null,
      },
    }).catch(() => {});

    return this.getAdminPaymentById(paymentId);
  },

  /**
   * Admin: Reconcile Payment against Provider Status API.
   */
  async reconcilePayment(
    paymentId: string,
    adminId: string
  ): Promise<AdminPaymentDetailDTO> {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw AppError.notFound('Payment not found', ErrorCodes.ERR_PAYMENT_NOT_FOUND);
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw AppError.notFound('Payment not found', ErrorCodes.ERR_PAYMENT_NOT_FOUND);
    }

    const provider = providerRegistry.getProvider(payment.provider);
    const latestAttempt = await PaymentAttempt.findOne({
      paymentId: payment._id,
    }).sort({ attemptNumber: -1 });

    if (!latestAttempt || !latestAttempt.providerPaymentId) {
      throw AppError.badRequest(
        'No provider payment identifier found to reconcile.',
        ErrorCodes.ERR_PAYMENT_PROVIDER_ERROR
      );
    }

    const providerStatus = await provider.getPaymentStatus(
      latestAttempt.providerPaymentId
    );

    if (providerStatus.status === PAYMENT_ATTEMPT_STATUS.SUCCEEDED) {
      await this.markPaymentSucceeded(
        payment._id,
        latestAttempt._id,
        providerStatus.providerTransactionId,
        providerStatus.providerReference
      );
    } else if (providerStatus.status === PAYMENT_ATTEMPT_STATUS.FAILED) {
      await this.markPaymentFailed(
        payment._id,
        latestAttempt._id,
        providerStatus.failureCode,
        providerStatus.failureMessage
      );
    }

    logger.info(
      `Admin ${adminId} reconciled Payment ${payment.paymentNumber} against provider ${payment.provider}`
    );

    return this.getAdminPaymentById(paymentId);
  },

  /**
   * Admin: Paginated listing with search and filters.
   */
  async listAdminPayments(input: AdminPaymentQueryInput): Promise<{
    payments: AdminPaymentListItemDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      method,
      provider,
      search,
      orderNumber,
      dateFrom,
      dateTo,
      sort = 'newest',
    } = input;

    const filter: Record<string, any> = {};

    if (status) filter.status = status;
    if (method) filter.method = method;
    if (provider) filter.provider = provider;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { paymentNumber: searchRegex },
        { providerTransactionId: searchRegex },
      ];
    }

    if (orderNumber) {
      const matchedOrders = await Order.find({
        orderNumber: new RegExp(orderNumber, 'i'),
      }).select('_id');
      const orderIds = matchedOrders.map((o) => o._id);
      filter.orderId = { $in: orderIds };
    }

    const sortOptions: Record<string, 1 | -1> = {};
    if (sort === 'newest') sortOptions.createdAt = -1;
    else if (sort === 'oldest') sortOptions.createdAt = 1;
    else if (sort === 'amount-high') sortOptions.amount = -1;
    else if (sort === 'amount-low') sortOptions.amount = 1;
    else if (sort === 'paidAt') sortOptions.paidAt = -1;

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate<{ orderId: { orderNumber: string } }>('orderId', 'orderNumber')
      .populate<{ userId: { email: string; firstName: string; lastName: string } }>(
        'userId',
        'email firstName lastName'
      );

    const items: AdminPaymentListItemDTO[] = payments.map((p) => {
      const order = p.orderId as any;
      const user = p.userId as any;
      return paymentMapper.toAdminListItemDTO(
        p as any,
        order?.orderNumber,
        user
          ? {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            }
          : undefined
      );
    });

    return {
      payments: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Admin: Get full details of a specific payment.
   */
  async getAdminPaymentById(paymentId: string): Promise<AdminPaymentDetailDTO> {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw AppError.notFound('Payment not found', ErrorCodes.ERR_PAYMENT_NOT_FOUND);
    }

    const payment = await Payment.findById(paymentId)
      .populate<{ orderId: { orderNumber: string } }>('orderId', 'orderNumber')
      .populate<{ userId: { email: string; firstName: string; lastName: string } }>(
        'userId',
        'email firstName lastName'
      );

    if (!payment) {
      throw AppError.notFound('Payment not found', ErrorCodes.ERR_PAYMENT_NOT_FOUND);
    }

    const attempts = await PaymentAttempt.find({
      paymentId: payment._id,
    }).sort({ attemptNumber: -1 });

    const order = payment.orderId as any;
    const user = payment.userId as any;

    return paymentMapper.toAdminDetailDTO(
      payment as any,
      attempts,
      order?.orderNumber,
      user
        ? {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : undefined
    );
  },


  /**
   * Safe hook for Order Cancellation: Marks active payment attempts as cancelled.
   */
  async cancelPaymentOnOrderCancellation(orderId: Types.ObjectId | string): Promise<void> {
    const payment = await Payment.findOne({ orderId });
    if (!payment || payment.status === PAYMENT_STATUS.SUCCEEDED) {
      return;
    }

    const now = new Date();
    await PaymentAttempt.updateMany(
      {
        paymentId: payment._id,
        status: {
          $in: [PAYMENT_ATTEMPT_STATUS.PENDING, PAYMENT_ATTEMPT_STATUS.PROCESSING],
        },
      },
      {
        $set: {
          status: PAYMENT_ATTEMPT_STATUS.CANCELLED,
          completedAt: now,
        },
      }
    );

    payment.status = PAYMENT_STATUS.CANCELLED;
    payment.cancelledAt = now;
    await payment.save();
  },
};
