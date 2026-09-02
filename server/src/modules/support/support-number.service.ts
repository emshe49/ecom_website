import { Counter } from '../orders/counter.model.js';

export const supportNumberService = {
  /**
   * Concurrency-safe atomic generation of unique human-readable ticket numbers.
   * Format: TKT-YYYY-000001
   */
  async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const key = `support-tickets-${year}`;

    const counter = await Counter.findOneAndUpdate(
      { key },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const paddedSequence = String(counter.sequence).padStart(6, '0');
    return `TKT-${year}-${paddedSequence}`;
  },
};
