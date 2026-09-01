import { Counter } from '../orders/counter.model.js';

export const paymentNumberService = {
  /**
   * Concurrency-safe atomic generation of unique human-readable payment numbers.
   * Format: PAY-YYYY-000001
   */
  async generatePaymentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const key = `payments-${year}`;

    const counter = await Counter.findOneAndUpdate(
      { key },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const paddedSequence = String(counter.sequence).padStart(6, '0');
    return `PAY-${year}-${paddedSequence}`;
  },
};
