import mongoose from 'mongoose';
import { ProductVariant } from '../modules/catalog/products/product-variant.model.js';
import { Inventory } from '../modules/inventory/inventory.model.js';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '../modules/inventory/inventory.constants.js';
import { env } from '../config/env.js';
import { logger } from '../shared/utils/logger.js';

export async function backfillInventory(): Promise<{
  totalVariants: number;
  createdCount: number;
  skippedCount: number;
}> {
  const variants = await ProductVariant.find({}).select('_id');
  const variantIds = variants.map((v) => v._id);

  const existingInventory = await Inventory.find({
    variantId: { $in: variantIds },
  }).select('variantId');

  const existingVariantIdSet = new Set(
    existingInventory.map((i) => i.variantId.toString())
  );

  let createdCount = 0;
  let skippedCount = 0;

  for (const variant of variants) {
    const vidStr = variant._id.toString();
    if (existingVariantIdSet.has(vidStr)) {
      skippedCount++;
      continue;
    }

    try {
      await Inventory.create({
        variantId: variant._id,
        onHand: 0,
        reserved: 0,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
      });
      createdCount++;
    } catch {
      // If already created concurrently, skip
      skippedCount++;
    }
  }

  return {
    totalVariants: variants.length,
    createdCount,
    skippedCount,
  };
}

// Direct execution support
if (process.argv[1] && process.argv[1].endsWith('backfill-inventory.ts')) {
  (async () => {
    try {
      logger.info('Starting inventory backfill migration...');
      await mongoose.connect(env.MONGODB_URI);
      const result = await backfillInventory();
      logger.info(
        `Inventory backfill completed successfully. Total: ${result.totalVariants}, Created: ${result.createdCount}, Skipped: ${result.skippedCount}`
      );

      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      logger.error(`Inventory backfill failed: ${String(err)}`);
      process.exit(1);
    }

  })();
}
