import { Counter } from '../orders/counter.model.js';

export const shipmentNumberService = {
  /**
   * Concurrency-safe atomic generation of unique human-readable shipment numbers.
   * Format: SHP-YYYY-000001
   */
  async generateShipmentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const key = `shipments-${year}`;

    const counter = await Counter.findOneAndUpdate(
      { key },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const paddedSequence = String(counter.sequence).padStart(6, '0');
    return `SHP-${year}-${paddedSequence}`;
  },
};
