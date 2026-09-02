import { EmailMessage } from './email-message.model.js';
import { EmailAttempt } from './email-attempt.model.js';
import { EMAIL_STATUS, EMAIL_PROVIDER, EMAIL_MAX_ATTEMPTS, EMAIL_ERROR_CODES } from './email.constants.js';
import { emailProviderRegistry } from './providers/provider-registry.js';
import { emailRendererService } from './email-renderer.service.js';
import { emailPreferenceService } from './email-preference.service.js';

export const emailService = {
  /**
   * Main entrypoint for transactional emails.
   */
  async sendTransactionalEmail(input: {
    userId?: string;
    recipient: string;
    templateId: string;
    data: any;
    deduplicationKey?: string;
    category?: string;
  }) {
    // 1. Check Preferences
    if (input.category) {
      const shouldSend = await emailPreferenceService.shouldSendEmail(input.userId, input.category);
      if (!shouldSend) {
        return { success: true, skipped: true, reason: 'Preference disabled' };
      }
    }

    // 2. Deduplication check
    if (input.deduplicationKey) {
      const existing = await EmailMessage.findOne({ deduplicationKey: input.deduplicationKey });
      if (existing) {
        if (existing.status === EMAIL_STATUS.SENT) {
          return { success: true, messageId: existing._id, deduplicated: true };
        }
        // If it's pending/failed, we might want to retry it instead of creating a new one.
        // We'll proceed to retry it below.
        return this.retryEmail(existing._id.toString());
      }
    }

    // 3. Render Template
    const { subject, html, text } = emailRendererService.render(input.templateId, input.data);

    // 4. Create Message Record
    const providerStr = process.env.EMAIL_PROVIDER || EMAIL_PROVIDER.TEST;
    
    let message = new EmailMessage({
      userId: input.userId,
      recipient: input.recipient,
      template: input.templateId,
      subject,
      status: EMAIL_STATUS.PENDING,
      provider: providerStr,
      deduplicationKey: input.deduplicationKey,
      metadata: { templateDataSnapshot: input.data }
    });
    
    // We catch MongoServerError (11000) for race conditions on dedup key
    try {
      await message.save();
    } catch (err: any) {
      if (err.code === 11000 && input.deduplicationKey) {
        const existing = await EmailMessage.findOne({ deduplicationKey: input.deduplicationKey });
        if (existing && existing.status === EMAIL_STATUS.SENT) {
          return { success: true, messageId: existing._id, deduplicated: true };
        }
        if (existing) {
          return this.retryEmail(existing._id.toString());
        }
      }
      throw err;
    }

    return this.executeSend(message, html, text);
  },

  /**
   * Execute the send via Provider
   */
  async executeSend(message: any, html: string, text: string) {
    message.status = EMAIL_STATUS.PROCESSING;
    message.attemptCount += 1;
    await message.save();

    const provider = emailProviderRegistry.getProvider();
    const providerStr = process.env.EMAIL_PROVIDER || EMAIL_PROVIDER.TEST;

    const attempt = new EmailAttempt({
      emailMessageId: message._id,
      attemptNumber: message.attemptCount,
      provider: providerStr,
      status: EMAIL_STATUS.PROCESSING,
      startedAt: new Date()
    });
    await attempt.save();

    const result = await provider.send({
      recipient: message.recipient,
      subject: message.subject,
      html,
      text,
      template: message.template,
      deduplicationKey: message.deduplicationKey,
    });

    attempt.finishedAt = new Date();

    if (result.success) {
      attempt.status = EMAIL_STATUS.SENT;
      attempt.providerMessageId = result.providerMessageId;
      await attempt.save();

      message.status = EMAIL_STATUS.SENT;
      message.providerMessageId = result.providerMessageId;
      message.sentAt = new Date();
      await message.save();
    } else {
      attempt.status = EMAIL_STATUS.FAILED;
      attempt.failureCode = result.failureCode;
      attempt.failureMessage = result.failureMessage;
      await attempt.save();

      message.status = EMAIL_STATUS.FAILED;
      message.failedAt = new Date();
      await message.save();
    }

    return {
      success: result.success,
      messageId: message._id,
      attemptId: attempt._id,
      providerResult: result
    };
  },

  /**
   * Retry a failed message (Admin or system initiated)
   */
  async retryEmail(messageId: string) {
    const message = await EmailMessage.findById(messageId);
    if (!message) {
      const err = new Error(EMAIL_ERROR_CODES.ERR_EMAIL_NOT_FOUND);
      (err as any).code = EMAIL_ERROR_CODES.ERR_EMAIL_NOT_FOUND;
      throw err;
    }

    if (message.status === EMAIL_STATUS.SENT) {
      const err = new Error(EMAIL_ERROR_CODES.ERR_EMAIL_ALREADY_SENT);
      (err as any).code = EMAIL_ERROR_CODES.ERR_EMAIL_ALREADY_SENT;
      throw err;
    }

    if (message.attemptCount >= EMAIL_MAX_ATTEMPTS) {
      const err = new Error(EMAIL_ERROR_CODES.ERR_EMAIL_MAX_ATTEMPTS_REACHED);
      (err as any).code = EMAIL_ERROR_CODES.ERR_EMAIL_MAX_ATTEMPTS_REACHED;
      throw err;
    }

    const { html, text } = emailRendererService.render(
      message.template,
      message.metadata?.templateDataSnapshot || {}
    );

    return this.executeSend(message, html, text);
  }
};
