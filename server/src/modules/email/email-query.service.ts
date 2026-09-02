import { EmailMessage } from './email-message.model.js';
import { EmailAttempt } from './email-attempt.model.js';

export const emailQueryService = {
  async listEmails(filters: any) {
    const { page, limit, ...queryFilters } = filters;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (queryFilters.status) query.status = queryFilters.status;
    if (queryFilters.template) query.template = queryFilters.template;
    if (queryFilters.provider) query.provider = queryFilters.provider;
    if (queryFilters.recipient) query.recipient = { $regex: queryFilters.recipient, $options: 'i' };
    if (queryFilters.providerMessageId) query.providerMessageId = queryFilters.providerMessageId;

    if (queryFilters.startDate || queryFilters.endDate) {
      query.createdAt = {};
      if (queryFilters.startDate) query.createdAt.$gte = new Date(queryFilters.startDate);
      if (queryFilters.endDate) query.createdAt.$lte = new Date(queryFilters.endDate);
    }

    const [data, total] = await Promise.all([
      EmailMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailMessage.countDocuments(query)
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async getEmailDetails(messageId: string) {
    const message = await EmailMessage.findById(messageId).lean();
    if (!message) return null;

    const attempts = await EmailAttempt.find({ emailMessageId: messageId })
      .sort({ attemptNumber: 1 })
      .lean();

    return {
      ...message,
      attempts
    };
  }
};
