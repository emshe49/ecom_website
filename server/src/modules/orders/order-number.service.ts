import { Counter } from './counter.model.js';

export const orderNumberService = {
  /**
   * Concurrency-safe atomic generation of unique human-readable order numbers.
   * Format: ORD-YYYY-000001
   */
  async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const key = `orders-${year}`;

    const counter = await Counter.findOneAndUpdate(
      { key },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const paddedSequence = String(counter.sequence).padStart(6, '0');
    return `ORD-${year}-${paddedSequence}`;
  },
};
